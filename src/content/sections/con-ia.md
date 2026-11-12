---
title: Cómo trabajo con IA
kicker: Método
summary: Trabajo solo, con un agente de IA como compañero. Yo decido y respondo del resultado; él ejecuta, y nada se da por bueno sin comprobarlo.
steps: [Entender, Planificar, Actuar, Evaluar, Ajustar, Cerrar]
repo: https://github.com/NeoBmo/withIA
command: así trabajo con IA
symbol: loop
afterProjects: true
order: 2
---

Una persona solo puede hacer una tarea a la vez. Yo trabajo solo, de la idea a la revisión, y en ese trabajo la IA es amigo, maestro y compañero: no solo acelera, también evalúa, corrige y prueba. Yo aporto el criterio y decido.

## El bucle

Cada tarea recorre los mismos pasos: entender el pedido, planificar si aporta, actuar, evaluar con evidencia y cerrar. Si la evaluación falla, se ajusta y se vuelve a intentar, con un máximo de tres intentos.

El fallo típico de un agente es declarar terminado algo que no comprobó. Por eso el criterio se fija antes de empezar y lo juzga quien no hizo el trabajo.

## Quién hace qué

- **Yo** decido lo crucial y respondo del resultado.
- **El coordinador**, la sesión principal del agente, afina el pedido, fija el criterio, reparte y juzga.
- **Un implementador** ejecuta una tarea acotada y devuelve evidencia.
- **Un revisor** con contexto limpio juzga un cambio que no escribió.
- **Un escritor** documenta lo que existe, contrastado con el código.
- **Las barreras**, permisos y hooks, frenan lo peligroso aunque el agente lo olvide.

## Qué no prometo

No hay porcentajes de ahorro ni prueba de que así se trabaje mejor o más rápido: no está medido, y los datos son de una sola persona. Tampoco hay barreras absolutas: cada una tiene límites, y están escritos. El método combina ideas de muchas fuentes y lo sigo afinando.

## Para probarlo

Todo está escrito en el repositorio, con licencia MIT: el método, los agentes, las reglas y lo que no ha funcionado. Puedes copiarlo, discutirlo o descartarlo.
