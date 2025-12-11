import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Amino acid color mapping - based on chemical properties
const AA_COLORS = {
  // Hydrophobic - green shades
  'A': '#2ECC71', 'V': '#27AE60', 'I': '#16A085', 'L': '#1ABC9C', 
  'M': '#45B39D', 'F': '#138D75', 'W': '#117A65', 'P': '#0E6655',
  
  // Polar uncharged - purple/pink shades
  'S': '#9B59B6', 'T': '#8E44AD', 'C': '#E91E63', 'Y': '#C2185B',
  'N': '#AD1457', 'Q': '#880E4F',
  
  // Positive charged - blue shades
  'K': '#3498DB', 'R': '#2980B9', 'H': '#5DADE2',
  
  // Negative charged - red/orange shades
  'D': '#E74C3C', 'E': '#C0392B',
  
  // Special - neutral
  'G': '#95A5A6'
};

// Simple 3D Protein Viewer using Canvas
function Protein3DViewer({ sequence }) {
  const canvasRef = useRef(null);
  const [rotation, setRotation] = useState({ x: 0, y: 0 });
  const animationRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.width = 800;
    const height = canvas.height = 600;

    // Create simplified 3D helix structure
    const points = [];
    const aminoAcids = sequence.split('');
    const radius = 80;
    const helixHeight = 400;
    
    aminoAcids.forEach((aa, i) => {
      const angle = (i / aminoAcids.length) * Math.PI * 6; // Multiple turns
      const yPos = (i / aminoAcids.length) * helixHeight - helixHeight / 2;
      
      points.push({
        x: Math.cos(angle) * radius,
        y: yPos,
        z: Math.sin(angle) * radius,
        aa: aa,
        color: AA_COLORS[aa] || '#ccc'
      });
    });

    function render() {
      ctx.fillStyle = '#1a1a2e';
      ctx.fillRect(0, 0, width, height);

      // Rotate points
      const rotatedPoints = points.map(p => {
        // Rotate around Y axis
        let x = p.x * Math.cos(rotation.y) - p.z * Math.sin(rotation.y);
        let z = p.x * Math.sin(rotation.y) + p.z * Math.cos(rotation.y);
        
        // Rotate around X axis
        let y = p.y * Math.cos(rotation.x) - z * Math.sin(rotation.x);
        z = p.y * Math.sin(rotation.x) + z * Math.cos(rotation.x);

        return { ...p, x, y, z };
      });

      // Sort by depth (z-index)
      rotatedPoints.sort((a, b) => b.z - a.z);

      // Draw connections (backbone)
      ctx.strokeStyle = '#4a5568';
      ctx.lineWidth = 2;
      ctx.beginPath();
      rotatedPoints.forEach((p, i) => {
        const screenX = width / 2 + p.x * 2;
        const screenY = height / 2 + p.y;
        
        if (i === 0) {
          ctx.moveTo(screenX, screenY);
        } else {
          ctx.lineTo(screenX, screenY);
        }
      });
      ctx.stroke();

      // Draw amino acids as spheres
      rotatedPoints.forEach(p => {
        const screenX = width / 2 + p.x * 2;
        const screenY = height / 2 + p.y;
        const scale = 1 + (p.z / 200); // Perspective scaling
        const size = 8 * scale;

        // Shadow for depth
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.beginPath();
        ctx.arc(screenX + 2, screenY + 2, size, 0, Math.PI * 2);
        ctx.fill();

        // Amino acid sphere
        const gradient = ctx.createRadialGradient(
          screenX - size/3, screenY - size/3, 0,
          screenX, screenY, size
        );
        gradient.addColorStop(0, p.color);
        gradient.addColorStop(1, adjustBrightness(p.color, -40));
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(screenX, screenY, size, 0, Math.PI * 2);
        ctx.fill();

        // Highlight
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.arc(screenX - size/4, screenY - size/4, size/3, 0, Math.PI * 2);
        ctx.fill();
      });

      // Auto-rotate
      setRotation(prev => ({
        x: prev.x + 0.003,
        y: prev.y + 0.005
      }));

      animationRef.current = requestAnimationFrame(render);
    }

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [sequence, rotation]);

  function adjustBrightness(color, amount) {
    const num = parseInt(color.slice(1), 16);
    const r = Math.max(0, Math.min(255, (num >> 16) + amount));
    const g = Math.max(0, Math.min(255, ((num >> 8) & 0x00FF) + amount));
    const b = Math.max(0, Math.min(255, (num & 0x0000FF) + amount));
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
  }

  return (
    <div className="viewer-3d">
      <canvas 
        ref={canvasRef} 
        width={800} 
        height={600}
        style={{ 
          maxWidth: '100%', 
          height: 'auto',
          borderRadius: '8px',
          background: '#1a1a2e'
        }}
      />
      <p className="info" style={{ marginTop: '10px', textAlign: 'center' }}>
        🧬 Simplified alpha helix structure (auto-rotating)
      </p>
    </div>
  );
}

function App() {
  const [sequences, setSequences] = useState([]);
  const [selectedSeq, setSelectedSeq] = useState(null);
  const [sequenceText, setSequenceText] = useState('');
  const [sequenceName, setSequenceName] = useState('');
  const [aminoAcids, setAminoAcids] = useState({});
  const [selectedPosition, setSelectedPosition] = useState(null);
  const [loading, setLoading] = useState(false);
  const [show3D, setShow3D] = useState(false);

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
                  setShow3D(false);
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2>{selectedSeq.name}</h2>
              <button 
                onClick={() => setShow3D(!show3D)} 
                className="btn"
                style={{ background: '#764ba2' }}
              >
                {show3D ? '📊 Show 2D View' : '🧬 Show 3D Structure'}
              </button>
            </div>
            <p className="info">Length: {selectedSeq.length} amino acids</p>
            
            {!show3D ? (
              <>
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

                <div className="legend">
                  <h3>Color Legend</h3>
                  <div className="legend-grid">
                    <div><span style={{ color: '#2ECC71' }}>●</span> Hydrophobic (A,V,I,L,M,F,W,P)</div>
                    <div><span style={{ color: '#9B59B6' }}>●</span> Polar (S,T,C,Y,N,Q)</div>
                    <div><span style={{ color: '#3498DB' }}>●</span> Positive (K,R,H)</div>
                    <div><span style={{ color: '#E74C3C' }}>●</span> Negative (D,E)</div>
                    <div><span style={{ color: '#95A5A6' }}>●</span> Special (G)</div>
                  </div>
                </div>
              </>
            ) : (
              <Protein3DViewer sequence={selectedSeq.sequence} />
            )}

            {selectedPosition !== null && !show3D && (
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