const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, 'src', 'index.css');
let css = fs.readFileSync(cssPath, 'utf8');
if (!css.includes('.mobile-menu-btn')) {
  css = css.replace('@media(max-width:768px){', `.mobile-menu-btn { display: none; }\n@media(max-width:768px){\n  .mobile-menu-btn { display: flex !important; }`);
  fs.writeFileSync(cssPath, css);
}

const portals = ['ClientPortal.jsx', 'ConsultantPortal.jsx', 'AdminPortal.jsx'];

portals.forEach(p => {
  const file = path.join(__dirname, 'src', 'pages', p);
  let content = fs.readFileSync(file, 'utf8');
  
  const funcName = p.replace('.jsx', '');
  
  // Add state
  const stateInjection = `export default function ${funcName}() {\n  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);`;
  content = content.replace(`export default function ${funcName}() {`, stateInjection);
  
  // Add hamburger button to topbar brand
  const brandSearch = `<div className="brand">`;
  const hamburgerHTML = `<div className="brand" style={{display: 'flex', alignItems: 'center', gap: '8px'}}>\n          <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)} style={{background:'none',border:'none',color:'var(--text)',alignItems:'center',cursor:'pointer',padding:0}}><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/></svg></button>`;
  content = content.replace(brandSearch, hamburgerHTML);
  
  // Update layout to add overlay
  const layoutSearch = `<div className="layout">`;
  const overlayHTML = `<div className="layout">\n        {isMobileMenuOpen && <div className="mobile-menu-overlay open" onClick={() => setIsMobileMenuOpen(false)}></div>}`;
  content = content.replace(layoutSearch, overlayHTML);
  
  // Update sidebar class
  const sidebarSearch = `<div className="sidebar">`;
  const sidebarHTML = `<div className={"sidebar " + (isMobileMenuOpen ? "open" : "")}>`;
  content = content.replace(sidebarSearch, sidebarHTML);
  
  fs.writeFileSync(file, content);
  console.log(`Updated ${p}`);
});
