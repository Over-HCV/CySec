#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Ejercicios de Criptografía - UR CySec
"""


# ==========================
# EJERCICIO 1: ATBASH (A <-> N)
# ==========================

def atbash_mapa_an():
    """
    Mapa Atbash estilo visto en clase (A<->N, B<->O, ..., M<->Z)
    Aplica simétrico para ambas mitades.
    """
    letras = {
        "A": "N", "B": "O", "C": "P", "D": "Q", "E": "R", "F": "S", "G": "T", "H": "U", "I": "V", "J": "W", "K": "X", "L": "Y", "M": "Z",
        "N": "A", "O": "B", "P": "C", "Q": "D", "R": "E", "S": "F", "T": "G", "U": "H", "V": "I", "W": "J", "X": "K", "Y": "L", "Z": "M",
    }
    return letras


def cifrar_atbash_an(texto: str) -> str:
    mapa = atbash_mapa_an()
    resultado = []
    for c in texto.upper():
        if c.isalpha():
            resultado.append(mapa.get(c, c))
        else:
            resultado.append(c)
    return "".join(resultado)


# ==========================
# EJERCICIO 2: SUSTITUCIÓN CHINA / Transposición por columnas
# ==========================

def sustitucion_china(texto: str, tamano_grupo: int = 3, invertir_impares: bool = True, invertir_matriz: bool = True) -> str:
    """
    Transposición tipo 'sustitución china':
    1. Dividir texto en grupos de n caracteres
    2. Invertir grupos en posiciones impares
    3. Invertir el orden de la matriz de grupos
    4. Leer por columnas para obtener el texto cifrado
    """
    mat = []

    total_grupos = len(texto) // tamano_grupo
    for i in range(total_grupos):
        span = texto[i * tamano_grupo : (i + 1) * tamano_grupo]
        if invertir_impares and i % 2 == 1:
            span = span[::-1]
        mat.append(span)

    resto = len(texto) % tamano_grupo
    if resto != 0:
        span = texto[total_grupos * tamano_grupo :]
        if invertir_impares and total_grupos % 2 == 1:
            span = span[::-1]
        mat.append(span)

    if invertir_matriz:
        mat = mat[::-1]

    if not mat:
        return ""

    max_cols = max(len(e) for e in mat)
    txt = []
    for i in range(max_cols):
        for e in mat:
            if i < len(e):
                txt.append(e[i])

    return "".join(txt)


if __name__ == "__main__":
    nombre = "over castrillon"
    print((nombre))
