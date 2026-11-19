---
title: Lo que aprendo
kicker: Método · 03/03
summary: "Cada proyecto deja algo: un error que no repetir, una regla nueva, una skill mejor escrita. Eso vuelve al método, y el método se afina con cada proyecto."
symbol: stairs
afterProjects: true
order: 2.2
---

## Crece con cada error

No basta con hacer: hay que hacer con criterio y quedarse con lo aprendido. Por eso le pido a la IA que me devuelva siempre el porqué de cada acción y de cada recomendación. Así aprendo por qué de una forma sí y de otra no, y cuando fallo, por qué fallé y cómo no repetirlo.

El sistema tampoco está terminado, ni pretende estarlo. Cada fallo se convierte en algo concreto: una regla, una barrera, una skill o un test, según qué lo arregla de verdad.

## De dónde salen las reglas

En noviembre de 2026 revisé los commits de arreglo y catorce días de conversaciones con el agente. Salieron 88 fallos reales: 60 de git, 18 que corregí yo y 10 que el propio modelo admitió. Los agrupé por tema y cada tema recibió su respuesta. La validación de servidor tuvo una skill; las reglas de negocio, tests en cada proyecto; las afirmaciones sin comprobar, una tabla de evidencia obligatoria.

## Un error que volvió como barrera

Un hook impide hacer commits directos en la rama principal. Al corregirle un falso positivo, se abrió un agujero: un comando escrito de otra forma pasaba sin bloquearse. Lo encontró un revisor que no había visto el cambio. Se eligió el lado seguro, bloquear de más, y quedó escrito lo que el hook todavía no ve.

## Lo que no salió

La skill para proteger escrituras de servidor se probó con ella y sin ella, y no ganó en su criterio principal. Está escrito así, en lugar de esconderlo: un método que solo cuenta sus aciertos no se puede corregir.
