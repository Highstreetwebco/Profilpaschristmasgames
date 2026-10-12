// Preserve the supplied mark's exact geometry and alpha. White lettering keeps
// it legible on the green page; the green symbol retains its original colour.
export default function BrandLogo(){
 return <span className="brand-anchor"><span className="brand-frame" data-brand-logo>
  <img className="brand brand-old" src="/assets/profilpas-logo.png" alt="Profilpas by Mapei"/>
  <svg className="brand brand-correct" viewBox="13 70 325 146" role="img" aria-label="Profilpas by Mapei">
   <defs><filter id="profilpas-white-ink" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
    <feColorMatrix in="SourceGraphic" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1 0" result="white"/>
    <feColorMatrix in="SourceGraphic" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  -8 8 0 0 0" result="greenMask"/>
    <feComposite in="SourceGraphic" in2="greenMask" operator="in" result="green"/>
    <feMerge><feMergeNode in="white"/><feMergeNode in="green"/></feMerge>
   </filter></defs>
   <image href="/assets/profilpas-correct-logo.png" width="350" height="286" filter="url(#profilpas-white-ink)"/>
  </svg>
 </span></span>;
}
