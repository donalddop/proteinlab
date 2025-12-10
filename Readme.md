# 🧬 ProteinLab

An interactive web platform for exploring and mutating protein sequences. Built to demonstrate full-stack development skills for computational biology applications.
Try it yourself at https://proteinlab.vercel.app/

## Features

- **Sequence Management**: Upload or paste protein sequences in FASTA format or plain text
- **Interactive Visualization**: Color-coded amino acid display with click-to-select interface
- **Mutation Engine**: Point mutation tool to explore sequence variants
- **Composition Analysis**: Real-time amino acid frequency statistics
- **RESTful API**: FastAPI backend with auto-generated OpenAPI documentation

## Tech Stack

**Backend:**
- FastAPI (modern Python web framework)
- Biopython (bioinformatics library)
- UV (fast Python package manager)

**Frontend:**
- React
- Axios for API calls
- CSS3 with gradient backgrounds

## Quick Start

### Backend
```bash
cd backend
uv run uvicorn main:app --reload
# API docs at http://localhost:8000/docs
```

### Frontend
```bash
cd frontend
npm install
npm start
# App at http://localhost:3000
```

## Example Usage

Try the Human Insulin example (110 amino acids):
```
MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN
```

## What I Learned

- Working with FASTA format and Biopython
- Designing APIs for scientific data
- Creating interactive visualizations for biomolecular data
- Understanding protein mutation nomenclature (e.g., A42G = Alanine→Glycine at position 42)

## Future Enhancements

- 3D structure visualization using Mol* viewer
- Codon optimization calculator
- Multiple sequence alignment
- Export mutated sequences to FASTA
- PostgreSQL persistence
- Docker containerization

## Why This Project?

Built as a portfolio piece to demonstrate full-stack development skills in the computational biology space. This showcases:
- Clean API design with FastAPI
- Modern React patterns
- Working knowledge of bioinformatics concepts
- Ability to rapidly prototype scientific tools

---

*Built in one evening with enthusiasm for protein engineering* 🚀
