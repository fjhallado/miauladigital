(()=>{
'use strict';
const raw=`H|Hidrógeno;He|Helio;Li|Litio;Be|Berilio;B|Boro;C|Carbono;N|Nitrógeno;O|Oxígeno;F|Flúor;Ne|Neón;Na|Sodio;Mg|Magnesio;Al|Aluminio;Si|Silicio;P|Fósforo;S|Azufre;Cl|Cloro;Ar|Argón;K|Potasio;Ca|Calcio;Sc|Escandio;Ti|Titanio;V|Vanadio;Cr|Cromo;Mn|Manganeso;Fe|Hierro;Co|Cobalto;Ni|Níquel;Cu|Cobre;Zn|Zinc;Ga|Galio;Ge|Germanio;As|Arsénico;Se|Selenio;Br|Bromo;Kr|Kriptón;Rb|Rubidio;Sr|Estroncio;Y|Itrio;Zr|Circonio;Nb|Niobio;Mo|Molibdeno;Tc|Tecnecio;Ru|Rutenio;Rh|Rodio;Pd|Paladio;Ag|Plata;Cd|Cadmio;In|Indio;Sn|Estaño;Sb|Antimonio;Te|Telurio;I|Yodo;Xe|Xenón;Cs|Cesio;Ba|Bario;La|Lantano;Ce|Cerio;Pr|Praseodimio;Nd|Neodimio;Pm|Prometio;Sm|Samario;Eu|Europio;Gd|Gadolinio;Tb|Terbio;Dy|Disprosio;Ho|Holmio;Er|Erbio;Tm|Tulio;Yb|Iterbio;Lu|Lutecio;Hf|Hafnio;Ta|Tántalo;W|Wolframio;Re|Renio;Os|Osmio;Ir|Iridio;Pt|Platino;Au|Oro;Hg|Mercurio;Tl|Talio;Pb|Plomo;Bi|Bismuto;Po|Polonio;At|Astato;Rn|Radón;Fr|Francio;Ra|Radio;Ac|Actinio;Th|Torio;Pa|Protactinio;U|Uranio;Np|Neptunio;Pu|Plutonio;Am|Americio;Cm|Curio;Bk|Berkelio;Cf|Californio;Es|Einstenio;Fm|Fermio;Md|Mendelevio;No|Nobelio;Lr|Lawrencio;Rf|Rutherfordio;Db|Dubnio;Sg|Seaborgio;Bh|Bohrio;Hs|Hassio;Mt|Meitnerio;Ds|Darmstadtio;Rg|Roentgenio;Cn|Copernicio;Nh|Nihonio;Fl|Flerovio;Mc|Moscovio;Lv|Livermorio;Ts|Teneso;Og|Oganesón`;
const aliases={74:['tungsteno'],54:['xenon'],36:['cripton'],117:['tenesino']};
const elements=raw.split(';').map((entry,index)=>{
 const [symbol,name]=entry.split('|');
 return {n:index+1,symbol,name};
});
const clean=text=>text.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase().replace(/\s+/g,' ');
function matches(answer,element,type){
 if(type==='simbolos')return answer.trim()===element.symbol;
 return [element.name,...(aliases[element.n]||[])].some(name=>clean(answer)===clean(name));
}
function correct(question){
 const element=elements[question.n-1];
 if(question.type==='ubicacion')return question.answer===element.n;
 return matches(String(question.answer??''),element,question.type);
}
globalThis.MAD_PERIODIC_MARKING={elements,correct};
})();
