from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from Bio import SeqIO
from io import StringIO
import json

app = FastAPI(title="ProteinLab API", version="1.0.0")

# CORS for React
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://proteinlab-a4nqpz1f8-donalds-projects-57c2319a.vercel.app",
        "https://*.vercel.app"  # Allow all Vercel preview deployments
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# In-memory storage
sequences_db = {}
sequence_counter = 0

# Models
class ProteinSequence(BaseModel):
    id: int
    name: str
    sequence: str
    length: int
    composition: dict

class MutationRequest(BaseModel):
    sequence_id: int
    position: int
    new_amino_acid: str

# Amino acid properties
AMINO_ACIDS = {
    'A': 'Alanine', 'R': 'Arginine', 'N': 'Asparagine', 'D': 'Aspartic acid',
    'C': 'Cysteine', 'E': 'Glutamic acid', 'Q': 'Glutamine', 'G': 'Glycine',
    'H': 'Histidine', 'I': 'Isoleucine', 'L': 'Leucine', 'K': 'Lysine',
    'M': 'Methionine', 'F': 'Phenylalanine', 'P': 'Proline', 'S': 'Serine',
    'T': 'Threonine', 'W': 'Tryptophan', 'Y': 'Tyrosine', 'V': 'Valine'
}

def analyze_sequence(sequence: str):
    """Calculate amino acid composition"""
    composition = {}
    for aa in AMINO_ACIDS.keys():
        count = sequence.count(aa)
        if count > 0:
            composition[aa] = count
    return composition

@app.get("/")
def root():
    return {"message": "ProteinLab API - Ready to optimize proteins!"}

@app.post("/sequences/upload", response_model=ProteinSequence)
async def upload_sequence(file: UploadFile = File(...)):
    """Upload a protein sequence (FASTA format)"""
    global sequence_counter
    
    try:
        content = await file.read()
        fasta_string = content.decode('utf-8')
        
        # Parse FASTA
        fasta_io = StringIO(fasta_string)
        records = list(SeqIO.parse(fasta_io, "fasta"))
        
        if not records:
            raise HTTPException(400, "No valid FASTA sequence found")
        
        record = records[0]  # Take first sequence
        sequence = str(record.seq).upper()
        
        # Validate it's a protein sequence
        invalid_chars = set(sequence) - set(AMINO_ACIDS.keys())
        if invalid_chars:
            raise HTTPException(400, f"Invalid amino acids found: {invalid_chars}")
        
        sequence_counter += 1
        protein = ProteinSequence(
            id=sequence_counter,
            name=record.id,
            sequence=sequence,
            length=len(sequence),
            composition=analyze_sequence(sequence)
        )
        
        sequences_db[sequence_counter] = protein
        return protein
        
    except Exception as e:
        raise HTTPException(400, f"Error parsing FASTA: {str(e)}")

@app.post("/sequences/text", response_model=ProteinSequence)
def add_sequence_text(name: str, sequence: str):
    """Add a protein sequence directly as text"""
    global sequence_counter
    
    sequence = sequence.upper().replace(" ", "").replace("\n", "")
    
    # Validate
    invalid_chars = set(sequence) - set(AMINO_ACIDS.keys())
    if invalid_chars:
        raise HTTPException(400, f"Invalid amino acids: {invalid_chars}")
    
    sequence_counter += 1
    protein = ProteinSequence(
        id=sequence_counter,
        name=name,
        sequence=sequence,
        length=len(sequence),
        composition=analyze_sequence(sequence)
    )
    
    sequences_db[sequence_counter] = protein
    return protein

@app.get("/sequences", response_model=List[ProteinSequence])
def list_sequences():
    """Get all stored sequences"""
    return list(sequences_db.values())

@app.get("/sequences/{sequence_id}", response_model=ProteinSequence)
def get_sequence(sequence_id: int):
    """Get a specific sequence"""
    if sequence_id not in sequences_db:
        raise HTTPException(404, "Sequence not found")
    return sequences_db[sequence_id]

@app.post("/sequences/{sequence_id}/mutate")
def mutate_sequence(sequence_id: int, position: int, new_aa: str):
    """Create a mutation at specified position"""
    if sequence_id not in sequences_db:
        raise HTTPException(404, "Sequence not found")
    
    protein = sequences_db[sequence_id]
    
    if position < 0 or position >= protein.length:
        raise HTTPException(400, f"Position must be between 0 and {protein.length-1}")
    
    new_aa = new_aa.upper()
    if new_aa not in AMINO_ACIDS:
        raise HTTPException(400, f"Invalid amino acid: {new_aa}")
    
    # Create mutated sequence
    old_aa = protein.sequence[position]
    mutated_seq = protein.sequence[:position] + new_aa + protein.sequence[position+1:]
    
    global sequence_counter
    sequence_counter += 1
    
    mutated_protein = ProteinSequence(
        id=sequence_counter,
        name=f"{protein.name}_mut_{old_aa}{position+1}{new_aa}",
        sequence=mutated_seq,
        length=len(mutated_seq),
        composition=analyze_sequence(mutated_seq)
    )
    
    sequences_db[sequence_counter] = mutated_protein
    
    return {
        "original_id": sequence_id,
        "mutated_id": sequence_counter,
        "mutation": f"{old_aa}{position+1}{new_aa}",
        "mutated_protein": mutated_protein
    }

@app.get("/amino-acids")
def get_amino_acids():
    """Get list of all amino acids"""
    return AMINO_ACIDS