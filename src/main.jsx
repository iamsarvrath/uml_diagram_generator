import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  Check, ChevronDown, Code2, Copy, Download, Ellipsis, GitBranch,
  Layers3, MousePointer2, Plus, Redo2, Search, Settings2, Share2,
  Sparkles, Trash2, Undo2, X
} from 'lucide-react';
import './styles.css';

const starterClasses = [
  { id: 'user', name: 'User', type: 'class', x: 110, y: 120, attributes: ['- id: Long', '- email: String', '+ active: Boolean'], methods: ['+ login(): Boolean', '+ logout(): void'] },
  { id: 'order', name: 'Order', type: 'class', x: 420, y: 315, attributes: ['- id: Long', '- createdAt: Date', '- total: Double'], methods: ['+ calculateTotal(): Double'] },
  { id: 'product', name: 'Product', type: 'class', x: 735, y: 120, attributes: ['- sku: String', '- price: Double'], methods: ['+ isAvailable(): Boolean'] }
];

const starterRelations = [
  { id: 'r1', from: 'user', to: 'order', label: 'places', cardinality: '1..*', kind: 'association' },
  { id: 'r2', from: 'order', to: 'product', label: 'contains', cardinality: '1..*', kind: 'aggregation' }
];

const iconButton = (label, Icon, onClick, active = false) => (
  <button className={`icon-button ${active ? 'active' : ''}`} aria-label={label} title={label} onClick={onClick}><Icon size={17} strokeWidth={1.8} /></button>
);

function App() {
  const [classes, setClasses] = useState(() => {
    try { return JSON.parse(localStorage.getItem('uml-classes')) || starterClasses; } catch { return starterClasses; }
  });
  const [relations, setRelations] = useState(() => {
    try { return JSON.parse(localStorage.getItem('uml-relations')) || starterRelations; } catch { return starterRelations; }
  });
  const [selectedId, setSelectedId] = useState('user');
  const [activeTab, setActiveTab] = useState('diagram');
  const [zoom, setZoom] = useState(100);
  const [dragging, setDragging] = useState(null);
  const [toast, setToast] = useState('');
  const [history, setHistory] = useState([]);
  const [future, setFuture] = useState([]);

  useEffect(() => { localStorage.setItem('uml-classes', JSON.stringify(classes)); }, [classes]);
  useEffect(() => { localStorage.setItem('uml-relations', JSON.stringify(relations)); }, [relations]);
  useEffect(() => { if (!toast) return; const timer = setTimeout(() => setToast(''), 2200); return () => clearTimeout(timer); }, [toast]);

  const selected = classes.find((item) => item.id === selectedId) || null;
  const javaCode = useMemo(() => classes.map((item) => {
    const header = item.type === 'interface' ? `public interface ${item.name} {` : `public class ${item.name} {`;
    const fields = item.attributes.map((entry) => `    ${toJavaMember(entry, true)}`).join('\n');
    const methods = item.methods.map((entry) => `    ${toJavaMember(entry, false)}`).join('\n');
    return `${header}\n${fields}${fields && methods ? '\n\n' : ''}${methods}\n}`;
  }).join('\n\n'), [classes]);

  function snapshot() { return { classes: JSON.parse(JSON.stringify(classes)), relations: JSON.parse(JSON.stringify(relations)) }; }
  function commit(nextClasses, nextRelations = relations) {
    setHistory((items) => [...items.slice(-19), snapshot()]);
    setFuture([]);
    setClasses(nextClasses);
    setRelations(nextRelations);
  }
  function addClass() {
    const index = classes.length + 1;
    const newClass = { id: `class-${Date.now()}`, name: `NewClass${index}`, type: 'class', x: 250 + (index % 3) * 90, y: 160 + (index % 2) * 100, attributes: ['- id: Long'], methods: ['+ execute(): void'] };
    commit([...classes, newClass]);
    setSelectedId(newClass.id);
  }
  function removeSelected() {
    if (!selected) return;
    const nextRelations = relations.filter((relation) => relation.from !== selected.id && relation.to !== selected.id);
    commit(classes.filter((item) => item.id !== selected.id), nextRelations);
    setSelectedId(classes.find((item) => item.id !== selected.id)?.id || null);
  }
  function updateSelected(field, value) {
    if (!selected) return;
    commit(classes.map((item) => item.id === selected.id ? { ...item, [field]: value } : item));
  }
  function updateList(field, value) {
    updateSelected(field, value.split('\n').filter(Boolean));
  }
  function undo() {
    const previous = history.at(-1);
    if (!previous) return;
    setFuture((items) => [...items, snapshot()]);
    setHistory((items) => items.slice(0, -1));
    setClasses(previous.classes); setRelations(previous.relations);
  }
  function redo() {
    const next = future.at(-1);
    if (!next) return;
    setHistory((items) => [...items, snapshot()]);
    setFuture((items) => items.slice(0, -1));
    setClasses(next.classes); setRelations(next.relations);
  }
  function moveCard(event, item) {
    if (event.button !== 0) return;
    const origin = { x: event.clientX, y: event.clientY, itemX: item.x, itemY: item.y };
    setDragging({ id: item.id, origin });
    const move = (moveEvent) => {
      const dx = (moveEvent.clientX - origin.x) / (zoom / 100);
      const dy = (moveEvent.clientY - origin.y) / (zoom / 100);
      setClasses((items) => items.map((entry) => entry.id === item.id ? { ...entry, x: Math.max(20, origin.itemX + dx), y: Math.max(20, origin.itemY + dy) } : entry));
    };
    const up = () => { setDragging(null); window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
  }
  function addRelation() {
    if (classes.length < 2) return;
    const from = selected?.id || classes[0].id;
    const to = classes.find((item) => item.id !== from)?.id || classes[0].id;
    const relation = { id: `r-${Date.now()}`, from, to, label: 'relates to', cardinality: '1..*', kind: 'association' };
    commit(classes, [...relations, relation]);
    setToast('Relationship added');
  }
  function copyCode() { navigator.clipboard?.writeText(javaCode); setToast('Java source copied'); }
  function exportCode() { const blob = new Blob([javaCode], { type: 'text/plain' }); const url = URL.createObjectURL(blob); const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'uml-generated.java'; anchor.click(); URL.revokeObjectURL(url); setToast('Java source downloaded'); }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand"><div className="brand-mark"><Layers3 size={17} /></div><strong>UML<span>studio</span></strong><span className="save-status"><Check size={13} /> Saved</span></div>
        <div className="project-name">Untitled project <ChevronDown size={15} /></div>
        <div className="top-actions">{iconButton('Undo', Undo2, undo)}{iconButton('Redo', Redo2, redo)}<span className="divider" />{iconButton('Share project', Share2, () => setToast('Share link copied'))}<button className="export-button" onClick={exportCode}><Download size={15} /> Export Java</button><button className="avatar">S</button></div>
      </header>

      <main className="workspace">
        <aside className="sidebar">
          <div className="side-heading"><span>Project</span><button className="more-button"><Ellipsis size={18} /></button></div>
          <nav className="side-nav"><button className="nav-item selected"><MousePointer2 size={16} /> Canvas</button><button className="nav-item" onClick={() => setActiveTab('code')}><Code2 size={16} /> Generated code <span className="nav-count">{classes.length}</span></button></nav>
          <div className="outline-title">Diagram outline <span>{classes.length}</span></div>
          <div className="outline-list">{classes.map((item) => <button key={item.id} className={`outline-item ${selectedId === item.id ? 'current' : ''}`} onClick={() => { setSelectedId(item.id); setActiveTab('diagram'); }}><span className="class-dot">{item.type === 'interface' ? 'I' : 'C'}</span>{item.name}<span className="item-chevron">›</span></button>)}</div>
          <button className="add-class-side" onClick={addClass}><Plus size={16} /> Add class</button>
          <div className="sidebar-bottom"><button className="nav-item"><Settings2 size={16} /> Settings</button><div className="tip-card"><Sparkles size={16} /><div><strong>Quick tip</strong><p>Drag classes around the canvas to arrange your architecture.</p></div></div></div>
        </aside>

        <section className="main-panel">
          <div className="toolbar">
            <div className="toolbar-title"><h1>Class diagram</h1><span className="live-pill"><i /> Live</span></div>
            <div className="toolbar-actions"><div className="search"><Search size={15} /><input placeholder="Search classes..." /></div><button className="secondary-button" onClick={addRelation}><GitBranch size={15} /> Relation</button><button className="primary-button" onClick={addClass}><Plus size={16} /> Add class</button></div>
          </div>
          <div className="tabs"><button className={activeTab === 'diagram' ? 'tab-active' : ''} onClick={() => setActiveTab('diagram')}>Diagram</button><button className={activeTab === 'code' ? 'tab-active' : ''} onClick={() => setActiveTab('code')}>Java source <span>Generated</span></button></div>

          {activeTab === 'diagram' ? <div className="canvas-wrap">
            <div className="canvas-grid" style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top left' }}>
              <svg className="relations-layer" width="1200" height="750">
                <defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="none" stroke="#8c93a5" strokeWidth="1.2" /></marker></defs>
                {relations.map((relation) => { const from = classes.find((item) => item.id === relation.from); const to = classes.find((item) => item.id === relation.to); if (!from || !to) return null; const x1 = from.x + 120; const y1 = from.y + 80; const x2 = to.x + 120; const y2 = to.y + 80; return <g key={relation.id}><line x1={x1} y1={y1} x2={x2} y2={y2} className="relation-line" markerEnd="url(#arrow)" /><text x={(x1 + x2) / 2} y={(y1 + y2) / 2 - 7} className="relation-label">{relation.label}</text><text x={(x1 + x2) / 2} y={(y1 + y2) / 2 + 11} className="relation-cardinality">{relation.cardinality}</text></g>; })}
              </svg>
              {classes.map((item) => <ClassCard key={item.id} item={item} selected={selectedId === item.id} onSelect={() => setSelectedId(item.id)} onMouseDown={(event) => moveCard(event, item)} />)}
            </div>
            <div className="canvas-empty"><span>+</span><p>Add a class to get started</p><small>or use the button above</small></div>
            <div className="canvas-controls"><button onClick={() => setZoom(Math.max(50, zoom - 10))}>−</button><span>{zoom}%</span><button onClick={() => setZoom(Math.min(150, zoom + 10))}>+</button></div>
          </div> : <CodePanel code={javaCode} onCopy={copyCode} onDownload={exportCode} />}
        </section>

        <aside className="inspector">
          <div className="inspector-heading"><div><span className="eyebrow">Inspector</span><h2>{selected ? selected.name : 'No selection'}</h2></div>{selected && <button className="delete-button" onClick={removeSelected} title="Delete class"><Trash2 size={16} /></button>}</div>
          {selected ? <div className="form-content">
            <label>Class name<input value={selected.name} onChange={(event) => updateSelected('name', event.target.value.replace(/\s/g, ''))} /></label>
            <label>Type<select value={selected.type} onChange={(event) => updateSelected('type', event.target.value)}><option value="class">Class</option><option value="interface">Interface</option><option value="abstract">Abstract class</option></select></label>
            <label>Attributes <span className="label-hint">one per line</span><textarea rows="5" value={selected.attributes.join('\n')} onChange={(event) => updateList('attributes', event.target.value)} /></label>
            <label>Methods <span className="label-hint">one per line</span><textarea rows="5" value={selected.methods.join('\n')} onChange={(event) => updateList('methods', event.target.value)} /></label>
            <div className="inspector-section"><div className="section-label">Relationships <span>{relations.filter((item) => item.from === selected.id || item.to === selected.id).length}</span></div>{relations.filter((item) => item.from === selected.id || item.to === selected.id).map((relation) => <div className="relation-row" key={relation.id}><GitBranch size={14} /><span>{classes.find((item) => item.id === (relation.from === selected.id ? relation.to : relation.from))?.name}</span><small>{relation.kind}</small></div>)}<button className="add-relation-link" onClick={addRelation}><Plus size={14} /> Add relationship</button></div>
          </div> : <div className="no-selection">Select a class on the canvas to edit its details.</div>}
        </aside>
      </main>
      {toast && <div className="toast"><Check size={15} /> {toast}</div>}
    </div>
  );
}

function ClassCard({ item, selected, onSelect, onMouseDown }) {
  return <div className={`class-card ${selected ? 'selected' : ''}`} style={{ left: item.x, top: item.y }} onClick={onSelect} onMouseDown={onMouseDown}><div className="card-title"><span className="class-symbol">{item.type === 'interface' ? 'I' : 'C'}</span><strong>{item.name}</strong><span className="card-menu">···</span></div><div className="card-divider" />{item.attributes.map((attribute, index) => <div className="member" key={`${attribute}-${index}`}>{attribute}</div>)}<div className="card-divider" />{item.methods.map((method, index) => <div className="member method" key={`${method}-${index}`}>{method}</div>)}</div>;
}

function CodePanel({ code, onCopy, onDownload }) {
  return <div className="code-panel"><div className="code-toolbar"><div><span className="file-dot" /> Generated.java <span className="code-meta">Java</span></div><div><button className="code-action" onClick={onCopy}><Copy size={14} /> Copy</button><button className="code-action" onClick={onDownload}><Download size={14} /> Download</button></div></div><pre>{code.split('\n').map((line, index) => <code key={index}><span className="line-number">{String(index + 1).padStart(2, '0')}</span><span className={line.includes('public') ? 'syntax-keyword' : line.includes('//') ? 'syntax-comment' : ''}>{line}</span>{'\n'}</code>)}</pre></div>;
}

function toJavaMember(value, field) {
  const cleaned = value.replace(/^[+-~#]\s*/, '');
  if (field) { const [name, type = 'Object'] = cleaned.split(':').map((part) => part.trim()); return `private ${type.toLowerCase() === 'long' ? 'Long' : type} ${name};`; }
  const match = cleaned.match(/(.+?)\((.*?)\)\s*:\s*(.+)/);
  if (!match) return `public void ${cleaned}() {}`;
  return `public ${match[3]} ${match[1]}(${match[2]}) {}`;
}

createRoot(document.getElementById('root')).render(<App />);
