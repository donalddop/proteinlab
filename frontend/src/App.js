import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = 'http://localhost:8000';

// Amino acid color mapping
const AA_COLORS = {
  'A': '#8B4513', 'R': '#0000FF', 'N': '#FF00FF', 'D': '#FF0000',
  'C': '#FFFF00', 'E': '#FF0000', 'Q': '#FF00FF', 'G': '#EBEBEB',
  'H': '#8282D2', 'I': '#0F820F', 'L': '#0F820F', 'K': '#145AFF',
  'M': '#E6E600', 'F': '#3232AA', 'P': '#DC9682', 'S': '#FA9600',
  'T': '#FA9600', 'W': '#B45AB4', 'Y': '#3232AA', 'V': '#0F820F'
};

function App() {
  const [sequences, setSequences] = useState([]);
  const [selectedSeq, setSelectedSeq] = useState(null);
  const [sequenceText, setSequenceText] = useState('');
  const [sequenceName, setSequenceName] = useState('');
  const [aminoAcids, setAminoAcids] = useState({});
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSequences();
    fetchAminoAcids();
  }, []);

  const fetchSequences = async () => {
    try {
      const res = await axios.get(`${API_URL}/sequences`);
      setSequences(res.data);
    } catch (err) {
      console.error('Error fetching sequences:', err);
    }
  };

  const fetchAminoAcids = async () => {
    try {
      const res = await axios.get(`${API_URL}/amino-acids`);
      setAminoAcids(res.data);
    } catch (err) {
      console.error('Error fetching amino acids:', err);
    }
  };

  const handleAddSequence = async () => {
    if (!sequenceName || !sequenceText) {
      alert('Please provide both name and sequence');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_URL}/sequences/text`, null, {
        params: { name: sequenceName, sequence: sequenceText }
      });
      setSequenceName('');
      setSequenceText('');
      fetchSequences();
      alert('Sequence added successfully!');
    } catch (err) {
      alert(`Error: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleMutate = async (newAA) => {
    if (!selectedSeq || selectedPosition === null) return;

    setLoading(true);
    try {
      const res = await axios.post(
        `${API_URL}/sequences/${selectedSeq.id}/mutate`,
        null,
        { params: { position: selectedPosition, new_aa: newAA } }
      );
      
      alert(`Mutation created: ${res.data.mutation}`);
      fetchSequences();
      setSelectedSeq(res.data.mutated_protein);
      setSelectedPosition(null);
    } catch (err) {
      alert(`Error: ${err.response?.data?.detail || err.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="header">
        <h1>🧬 ProteinLab</h1>
        <p>Explore and mutate protein sequences</p>
      </header>

      <div className="container">
        {/* Add Sequence Section */}
        <div className="section">
          <h2>Add New Sequence</h2>
          <input
            type="text"
            placeholder="Sequence Name (e.g., Insulin)"
            value={sequenceName}
            onChange={(e) => setSequenceName(e.target.value)}
            className="input"
          />
          <textarea
            placeholder="Paste protein sequence (e.g., MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN)"
            value={sequenceText}
            onChange={(e) => setSequenceText(e.target.value)}
            rows={4}
            className="textarea"
          />
          <button onClick={handleAddSequence} disabled={loading} className="btn btn-primary">
            {loading ? 'Adding...' : 'Add Sequence'}
          </button>
          <div className="example">
            <small>
              Try this example (Insulin): 
              <button 
                onClick={() => {
                  setSequenceName('Human Insulin');
                  setSequenceText('MALWMRLLPLLALLALWGPDPAAAFVNQHLCGSHLVEALYLVCGERGFFYTPKTRREAEDLQVGQVELGGGPGAGSLQPLALEGSLQKRGIVEQCCTSICSLYQLENYCN');
                }}
                className="btn-link"
              >
                Load Example
              </button>
            </small>
          </div>
        </div>

        {/* Sequence List */}
        <div className="section">
          <h2>Sequences ({sequences.length})</h2>
          <div className="sequence-list">
            {sequences.map(seq => (
              <div
                key={seq.id}
                className={`sequence-item ${selectedSeq?.id === seq.id ? 'selected' : ''}`}
                onClick={() => {
                  setSelectedSeq(seq);
                  setSelectedPosition(null);
                }}
              >
                <strong>{seq.name}</strong>
                <span className="badge">{seq.length} aa</span>
              </div>
            ))}
          </div>
        </div>

        {/* Selected Sequence Viewer */}
        {selectedSeq && (
          <div className="section">
            <h2>{selectedSeq.name}</h2>
            <p className="info">Length: {selectedSeq.length} amino acids</p>
            
            <div className="sequence-viewer">
              {selectedSeq.sequence.split('').map((aa, idx) => (
                <div
                  key={idx}
                  className={`amino-acid ${selectedPosition === idx ? 'selected-aa' : ''}`}
                  style={{ backgroundColor: AA_COLORS[aa] || '#ccc' }}
                  onClick={() => setSelectedPosition(idx)}
                  title={`${aa} at position ${idx + 1}`}
                >
                  {aa}
                </div>
              ))}
            </div>

            {selectedPosition !== null && (
              <div className="mutation-panel">
                <h3>
                  Mutate position {selectedPosition + 1} 
                  ({selectedSeq.sequence[selectedPosition]})
                </h3>
                <div className="mutation-options">
                  {Object.keys(aminoAcids).map(aa => (
                    <button
                      key={aa}
                      onClick={() => handleMutate(aa)}
                      disabled={loading || aa === selectedSeq.sequence[selectedPosition]}
                      className="btn-aa"
                      style={{ backgroundColor: AA_COLORS[aa] }}
                      title={aminoAcids[aa]}
                    >
                      {aa}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="composition">
              <h3>Amino Acid Composition</h3>
              <div className="composition-grid">
                {Object.entries(selectedSeq.composition).map(([aa, count]) => (
                  <div key={aa} className="composition-item">
                    <span style={{ color: AA_COLORS[aa] }}>●</span> {aa}: {count}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;