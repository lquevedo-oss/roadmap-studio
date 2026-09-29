const countryNames={CL:'🇨🇱 Chile',PE:'🇵🇪 Perú',CO:'🇨🇴 Colombia',MX:'🇲🇽 México',BR:'🇧🇷 Brasil'};
const allCountries=Object.keys(countryNames);
const months=['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const allSolutions=['Colaboración','Analítica','Automatización','Plataforma'];
const record=(id,title,description,solution,stage,date,countries='ALL',missions=[],ai=false)=>{
 const [yearPart,periodPart]=date.split('-');const month=periodPart.startsWith('Q')?null:Number(periodPart);
 return {id,title,description,solution,stage,year:Number(yearPart),month,quarter:month?Math.ceil(month/3):Number(periodPart.slice(1)),countries:countries==='ALL'?allCountries:countries,missions,ai};
};
// Entire dataset is synthetic. It does not describe a company's product plans.
const items=[
record("demo-01","Nuevo espacio de proyectos","Iniciativa ficticia para demostrar la navegación, los filtros y la presentación de información.","Plataforma","Lanzado","2026-01","ALL",[],false),
record("demo-02","Tableros compartidos","Iniciativa ficticia para demostrar la navegación, los filtros y la presentación de información.","Colaboración","Lanzado parcialmente","2026-02","ALL",[],false),
record("demo-03","Exportación de reportes","Iniciativa ficticia para demostrar la navegación, los filtros y la presentación de información.","Analítica","Próximamente","2026-03","ALL",[],false),
record("demo-04","Recordatorios configurables","Iniciativa ficticia para demostrar la navegación, los filtros y la presentación de información.","Automatización","Discovery","2026-04","ALL",[],false),
record("demo-05","Búsqueda unificada","Iniciativa ficticia para demostrar la navegación, los filtros y la presentación de información.","Plataforma","Lanzado","2026-05","ALL",[],false),
record("demo-06","Filtros por equipo","Iniciativa ficticia para demostrar la navegación, los filtros y la presentación de información.","Colaboración","Lanzado parcialmente","2026-06","ALL",[],false),
record("demo-07","Plantillas reutilizables","Iniciativa ficticia para demostrar la navegación, los filtros y la presentación de información.","Analítica","Próximamente","2026-07","ALL",[],false),
record("demo-08","Panel de actividad","Iniciativa ficticia para demostrar la navegación, los filtros y la presentación de información.","Automatización","Discovery","2026-08","ALL",[],false),
record("demo-09","Resumen asistido de tareas","Iniciativa ficticia para demostrar la navegación, los filtros y la presentación de información.","Plataforma","Lanzado","2026-09","ALL",[],true),
record("demo-10","Notificaciones agrupadas","Iniciativa ficticia para demostrar la navegación, los filtros y la presentación de información.","Colaboración","Lanzado parcialmente","2026-10","ALL",[],false),
record("demo-11","Vista de objetivos","Iniciativa ficticia para demostrar la navegación, los filtros y la presentación de información.","Analítica","Próximamente","2026-11","ALL",[],false),
record("demo-12","Mejoras de accesibilidad","Iniciativa ficticia para demostrar la navegación, los filtros y la presentación de información.","Automatización","Discovery","2026-12","ALL",[],false),
];
