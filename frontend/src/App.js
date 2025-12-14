import React, { useState, useEffect, useMemo, useCallback } from 'react';
import axios from 'axios';
import './App.css';
import { Canvas, useThree } from '@react-three/fiber';
import { OrbitControls, Sphere, Line, Html } from '@react-three/drei';
import * as THREE from 'three';

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



// ============================================================================

// 3D Protein Viewer using React Three Fiber

// ============================================================================



// Helper component for each amino acid sphere
function AminoAcidSphere({ position, aa, color, onHover, onUnhover }) {
  return (
    <Sphere
      position={position}
      args={[0.8, 32, 32]} // radius, widthSegments, heightSegments
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover(aa, e.clientX, e.clientY);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        onUnhover();
      }}
    >
      <meshStandardMaterial color={color} roughness={0.5} />
    </Sphere>
  );
}

// The main 3D model component
function ProteinModel({ sequence, setTooltip }) {
  const { camera } = useThree();

  const points = useMemo(() => {
    const aminoAcids = sequence.split('');
    const radius = 5;
    const helixHeight = 25;
    const turnCount = 4;
    
    return aminoAcids.map((aa, i) => {
      const t = i / aminoAcids.length;
      const angle = t * Math.PI * 2 * turnCount;
      const yPos = t * helixHeight - helixHeight / 2;
      
      const point = new THREE.Vector3(
        Math.cos(angle) * radius,
        yPos,
        Math.sin(angle) * radius
      );
      point.aa = aa;
      point.color = AA_COLORS[aa] || '#ccc';
      point.positionIndex = i + 1;
      return point;
    });
  }, [sequence]);

  const handlePointerOver = useCallback((aa, x, y) => {
    setTooltip({
      visible: true,
      content: `${aa.aa} at position ${aa.positionIndex}`,
      x: x,
      y: y,
    });
  }, [setTooltip]);

  const handlePointerOut = useCallback(() => {
    setTooltip({ visible: false, content: '', x: 0, y: 0 });
  }, [setTooltip]);

  return (
    <>
      {/* Amino Acid Spheres */}
      {points.map((p, i) => (
        <AminoAcidSphere
          key={i}
          position={[p.x, p.y, p.z]}
          aa={{ aa: p.aa, positionIndex: p.positionIndex }}
          color={p.color}
          onHover={handlePointerOver}
          onUnhover={handlePointerOut}
        />
      ))}
      
      {/* Backbone */}
      <Line
        points={points}
        color="#4a5568"
        lineWidth={5}
      />
    </>
  );
}



function Protein3DViewer({ sequence }) {

  const [tooltip, setTooltip] = useState({ visible: false, content: '', x: 0, y: 0 });



  return (

    <div className="viewer-3d" style={{ position: 'relative', height: '600px' }}>

      {tooltip.visible && (

        <div

          style={{

            position: 'absolute',

            left: `${tooltip.x + 15}px`,

            top: `${tooltip.y}px`,

            background: 'rgba(0, 0, 0, 0.7)',

            color: 'white',

            padding: '5px 10px',

            borderRadius: '4px',

            pointerEvents: 'none',

            transform: 'translateY(-50%)',

            fontSize: '12px',

            zIndex: 100,

          }}

        >

          {tooltip.content}

        </div>

      )}

      <Canvas 

        camera={{ position: [0, 0, 40], fov: 50 }}

        style={{ background: '#1a1a2e', borderRadius: '8px' }}

      >

        <ambientLight intensity={0.6} />

        <directionalLight position={[10, 10, 5]} intensity={1} />

        <directionalLight position={[-10, -10, -5]} intensity={0.5} />

        

        <ProteinModel sequence={sequence} setTooltip={setTooltip} />

        

        <OrbitControls 

          enablePan={true}

          enableZoom={true}

          mouseButtons={{

            LEFT: THREE.MOUSE.ROTATE,

            MIDDLE: THREE.MOUSE.DOLLY,

            RIGHT: THREE.MOUSE.PAN,

          }}

        />

      </Canvas>

       <p className="info" style={{ marginTop: '10px', textAlign: 'center' }}>

        <b>Drag</b> to rotate, <b>Right-drag</b> to pan, <b>Scroll</b> to zoom.

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