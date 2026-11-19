---
title: Cuadre
status: piloto
strength: Gestión y manejo de información
summary: "Software de gestión de cartera y caja para negocios con equipo en la calle: cada movimiento de dinero queda registrado y cuadra."
stack: [Next.js, React, TypeScript, Supabase, PostgreSQL]
symbol: ledger
order: 2
---

## Por qué

Un conocido iba a rentar un sistema para su negocio y me pidió que lo investigara. Ninguno se ajustaba a cómo trabajan estos negocios, así que le propuse construirlo. Antes todo se llevaba a mano y en papel: los errores eran frecuentes, y cada descuadre desgastaba la confianza entre el negocio y sus clientes.

## Para qué

Para que el negocio tenga trazabilidad de cada peso: la caja, los contratos con sus clientes y el dinero que maneja cada cobrador en su jornada. El dueño ve el día completo, y el cobrador lleva en el celular lo que antes anotaba en un cuaderno. El sistema además avisa cuando una condición supera la tasa de usura vigente: ayuda a operar dentro de la ley.

## Cómo

**El dinero no se edita.** Cada movimiento es definitivo: un error se corrige con un ajuste o un reverso que apunta al original y lleva su motivo. El saldo se calcula desde el historial y nunca se guarda, así no hay forma de que se descuadre en silencio.

**Todo o nada.** Un cobro registra el pago, el movimiento de caja y la auditoría en una sola operación. Si el cobrador pierde la señal y reenvía, no se cobra dos veces.

**Ninguna caja queda en negativo.** Dos salidas al mismo tiempo no pueden pasar las dos: la segunda espera a que la primera termine.

Lo construí con mi flujo de IA: cada decisión quedó escrita antes de programarla, y el sistema tiene pruebas de unidad, de integración y de extremo a extremo, con revisión de accesibilidad.

## En qué va

La primera versión está completa y estoy en el rediseño visual; lo siguiente es el piloto con un negocio real. El código es privado mientras decido su futuro como producto, así que aquí no hay enlace al repositorio ni a la demo.
