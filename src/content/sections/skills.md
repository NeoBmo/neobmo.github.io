---
title: Skills
kicker: Método · 02/03
summary: "Una skill es un manual breve que el agente carga solo cuando la tarea lo pide: cómo planificar, cómo revisar, cómo publicar. Así no responde como un modelo cualquiera, sino con mi forma de trabajar."
symbol: skills
afterProjects: true
order: 2.1
---

## El sistema es mío, no del modelo

Un modelo sin contexto responde igual que a todo el mundo. Mi forma de trabajar está escrita en archivos de texto, versionados en git: una doctrina común, los agentes, las reglas y las skills. La misma doctrina la usan Claude Code y OpenCode, este último con modelos gratuitos; cada herramienta solo tiene un adaptador pequeño. Si mañana cambio de herramienta, el método se queda.

## Una biblioteca de habilidades

Las skills son esa biblioteca: unas las escribo, otras las adapto y otras las recojo de internet. Ninguna de afuera entra sin pasar antes una revisión: si no puedo leer su código, no se instala.

## Las que escribí

- **vet** evalúa una herramienta externa antes de instalarla y anota el veredicto.
- **sdd** decide cuánta planificación pide una tarea y escribe la especificación, el plan y las tareas.
- **web-quality-gate** revisa una web antes de publicarla: accesibilidad, rendimiento, SEO, seguridad y páginas legales.
- **hardening-server-writes** protege las escrituras de servidor con dinero o stock contra carreras y reintentos.
- **readme-craft**, **astro-pages-seo** y **slow-network-check** nacieron construyendo este portafolio.

## Cómo decido cuál crear

Una skill ocupa espacio en cada conversación, así que no se crea por intuición. Primero miro qué falla de verdad; después mido cuánto se usa cada una y si evita un fallo real. La que no se usa ni evita nada, se retira.
