use sp1_sdk::{HashableKey, ProverClient, SP1Stdin, Prover, ProvingKey, Elf};
use serde::{Deserialize, Serialize};
use std::fs;
use std::env;

/// Matches the circuit's ProverInput struct exactly.
#[derive(Deserialize, Serialize)]
struct ProverInput {
    merkle_root: [u8; 32],
    total_assets: u64,
    cycle_id: u64,
    nullifier_count: u64,
    balances: Vec<u64>,
    user_ids: Vec<String>,
    merkle_proofs: Vec<Vec<[u8; 32]>>,
}

#[derive(Serialize)]
struct ProofOutput {
    status: String,
    proof: String,
    public_values: String,
    vkey_hash: String,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    sp1_sdk::utils::setup_logger();

    let args: Vec<String> = env::args().collect();
    if args.len() < 3 {
        eprintln!("Usage: {} <input.json> <output.json>", args[0]);
        std::process::exit(1);
    }

    let input_path = &args[1];
    let output_path = &args[2];

    // Read ELF (compiled circuit binary)
    let elf_path = env::var("ELF_PATH")
        .unwrap_or_else(|_| "../solvency/target/elf-compilation/riscv64im-succinct-zkvm-elf/release/solvency-circuit".to_string());

    let elf_bytes = fs::read(&elf_path).map_err(|e| {
        anyhow::anyhow!("Failed to read ELF at '{}': {}. Run `cargo prove build` in circuits/solvency/", elf_path, e)
    })?;

    // Parse JSON input
    let input_bytes = fs::read_to_string(input_path)?;
    let input_struct: ProverInput = serde_json::from_str(&input_bytes)
        .map_err(|e| anyhow::anyhow!("Failed to parse input JSON: {}", e))?;

    // Write to SP1's stdin
    let mut stdin = SP1Stdin::new();
    stdin.write(&input_struct);

    println!("[host] SP1_PROVER={}", env::var("SP1_PROVER").unwrap_or_else(|_| "cpu".into()));
    println!("[host] Connecting to SP1 prover…");

    let client = ProverClient::from_env().await;

    let elf_slice: &'static [u8] = Box::leak(elf_bytes.into_boxed_slice());
    let elf = Elf::Static(elf_slice);
    let pk = client.setup(elf).await.unwrap();

    println!("[host] Submitting proof request…");

    // SP1 v6 proving API: returns a future directly
    let proof = client
        .prove(&pk, stdin)
        .await
        .map_err(|e| anyhow::anyhow!("Proving failed: {:?}", e))?;

    // Encode proof bytes as hex via bincode serialization
    let proof_bytes = bincode::serialize(&proof)
        .map_err(|e| anyhow::anyhow!("Failed to serialize proof: {}", e))?;
    let proof_hex = format!("0x{}", hex::encode(&proof_bytes));

    // Encode public values as hex
    let pub_vals = hex::encode(proof.public_values.as_slice());

    // Compute vkey hash
    let vkey_hash = pk.verifying_key().bytes32().to_string();

    let output = ProofOutput {
        status: "completed".to_string(),
        proof: proof_hex,
        public_values: format!("0x{}", pub_vals),
        vkey_hash,
    };

    fs::write(output_path, serde_json::to_string_pretty(&output)?)?;
    println!("[host] Proof saved to {}", output_path);

    Ok(())
}
