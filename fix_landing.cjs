const fs = require('fs');

let content = fs.readFileSync('src/pages/Landing.jsx', 'utf8');

// Replace imports and nav
content = content.replace(
  `import React from 'react';\nimport { useNavigate } from 'react-router-dom';`,
  `import React from 'react';\nimport { useNavigate } from 'react-router-dom';\nimport { Star, School, BookOpen, Calculator, Globe, Microscope, MessageCircle, Palette, Lock, GraduationCap, CheckCircle, Moon, Sun } from 'lucide-react';\nimport { useTheme } from '../lib/useTheme';`
);

content = content.replace(
  `export default function Landing() {\n  const navigate = useNavigate();`,
  `export default function Landing() {\n  const navigate = useNavigate();\n  const { isLightMode, toggleTheme } = useTheme();`
);

content = content.replace(
  `<span style={{cursor: 'pointer', opacity: 0.8}} onClick={() => navigate('/careers')}>Become a Consultant</span>\n          <button className="btn btn-primary" onClick={() => navigate('/auth/client')}>Get Started</button>`,
  `<span style={{cursor: 'pointer', opacity: 0.8}} onClick={() => navigate('/careers')}>Become a Consultant</span>\n          <button style={{background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', display: 'flex', alignItems: 'center'}} onClick={toggleTheme}>\n            {isLightMode ? <Moon size={20} /> : <Sun size={20} />}\n          </button>\n          <button className="btn btn-primary" onClick={() => navigate('/auth/client')}>Get Started</button>`
);

// Replace emojis
content = content.replace(
  `<div style={{display: 'inline-block', background: 'rgba(245,158,11,0.1)', color: 'var(--gold)', padding: '8px 16px', borderRadius: '30px', fontSize: '14px', fontWeight: 600, marginBottom: '24px'}}>\n            ⭐ Trusted by students from Grade R to PhD across South Africa\n          </div>`,
  `<div style={{display: 'inline-flex', alignItems: 'center', gap: '8px', background: 'rgba(245,158,11,0.1)', color: 'var(--gold)', padding: '8px 16px', borderRadius: '30px', fontSize: '14px', fontWeight: 600, marginBottom: '24px'}}>\n            <Star size={16} /> Trusted by students from Grade R to PhD across South Africa\n          </div>`
);

content = content.replace(`{['🏫 Primary School', '🎒 Secondary School', '🎓 Undergraduate', '📜 Postgraduate'].map((level, idx) => (`, `{['Primary School', 'Secondary School', 'Undergraduate', 'Postgraduate'].map((level, idx) => (`);

content = content.replace(`<div style={{fontSize: '48px'}}>🏫</div>`, `<div style={{color: 'var(--blue)'}}><School size={48} /></div>`);

content = content.replace(`✏️ English & Literacy`, `<BookOpen size={20} /> English & Literacy`);
content = content.replace(`🔢 Mathematics`, `<Calculator size={20} /> Mathematics`);
content = content.replace(`🌍 Life Skills`, `<Globe size={20} /> Life Skills`);
content = content.replace(`🔬 Natural Sciences`, `<Microscope size={20} /> Natural Sciences`);
content = content.replace(`🗣️ Home Language`, `<MessageCircle size={20} /> Home Language`);
content = content.replace(`🎨 Arts & Crafts`, `<Palette size={20} /> Arts & Crafts`);

content = content.replace(`<div style={{fontSize: '32px'}}>🔒</div>`, `<div style={{color: 'var(--gold)'}}><Lock size={32} /></div>`);
content = content.replace(`<div style={{fontSize: '32px'}}>🎓</div>`, `<div style={{color: 'var(--purple)'}}><GraduationCap size={32} /></div>`);
content = content.replace(`<div style={{fontSize: '32px'}}>✅</div>`, `<div style={{color: 'var(--green)'}}><CheckCircle size={32} /></div>`);

fs.writeFileSync('src/pages/Landing.jsx', content, 'utf8');
console.log('Landing.jsx updated successfully.');
