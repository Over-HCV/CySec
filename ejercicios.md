# Esquemas de criptografía clásico

## Sustitución simple

Las sustituciones son:
A: N
B: O
C: P
D: Q
E: R
F: S
G: T
H: U
I: V
J: W
K: X
L: Y
M: Z

BIREPNFGEVYYBA

## Sustitución polialfabética

Clave: UROSARIO
Texto: OVERCASTRILLON

(El ejemplo de la diapositiva es clave WORD y texto CRYPTOGRAPHY -> `YFPSPCXUWDYB`)

Entonces repetimos hasta cubrir el texto:

```
UROSARIOUROSAR
OVERCASTRILLON
--------------
IMSJCRAHLZZDOE
```

<!-- Corregido: posición 9 R+U = L (antes J) y posición 12 L+S = D (antes C) -->


## Sustitución por transposición

```
5371624
ROSARIO

OVER_CA
STRILLO
N______
```

La numeración va por orden alfabético y las letras repetidas se numeran de izquierda a derecha, así cada columna tiene un número único. Se leen las columnas en ese orden:

```
1:A -> RI    2:I -> CL    3:O -> VT    4:O -> AO
5:R -> OSN   6:R -> _L    7:S -> ER
```

La clave quedaría como:

RICLVTAOOSN_LER

(Sin contar el espacio, con la rejilla OVERCAS / TRILLON, quedaría `RLAOVRSNOTCLEI`)


## Método Chino

Se definen la cantidad de filas (3) y ya lo que llenen las columnas

LLACO
OIS V
NRTRE

De forma que la clave es:

`LLACOOIS VNRTRE`
