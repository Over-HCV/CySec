import { describe, expect, it } from 'vitest'
import { parseBib } from '../app/features/visual/lib/parse-bib'
import { countKind, joined, REFS_BIB, repoFile } from './fixtures'

const bib = repoFile(REFS_BIB)

describe('parseBib sobre refs.bib', () => {
  const blocks = parseBib(bib)

  it('los bloques cubren el archivo entero', () => {
    expect(joined(bib, blocks)).toBe(bib)
  })

  it('encuentra las 12 entradas con su tipo y clave', () => {
    const entries = blocks.filter(b => b.kind === 'bibEntry')
    expect(entries).toHaveLength(12)

    const byKey = new Map(entries.map(e => [
      e.fields.find(f => f.name === 'clave')!.value,
      e.fields.find(f => f.name === 'tipo')!.value
    ]))
    expect(byKey.get('togaf92')).toBe('book')
    expect(byKey.get('iso27001')).toBe('standard')
    expect(byKey.get('sabsa2009')).toBe('techreport')
    expect(byKey.get('dbir2025')).toBe('report')
    expect([...byKey.values()].filter(t => t === 'online')).toHaveLength(8)
  })

  it('cada span de campo apunta exactamente a su valor', () => {
    for (const block of blocks) {
      for (const f of block.fields) {
        expect(bib.slice(f.span.from, f.span.to)).toBe(f.value)
      }
    }
  })

  it('conserva las llaves anidadas del título de togaf92', () => {
    const togaf = entry('togaf92')
    expect(value(togaf, 'title')).toBe('The {TOGAF} Standard, Version 9.2')
    expect(value(togaf, 'author')).toBe('{The Open Group}')
    expect(value(togaf, 'year')).toBe('2018')
  })

  it('no reformatea la entrada desalineada (avast-forbes)', () => {
    // Es el único sitio del archivo donde la alineación de campos está rota.
    // Un serializador «bonito» la arreglaría y metería ruido en el diff.
    const avast = entry('avast-forbes')
    expect(bib.slice(avast.span.from, avast.span.to)).toContain('  journaltitle = {Forbes},')
    expect(bib.slice(avast.span.from, avast.span.to)).toContain('  urldate = {2026-08-14}')
  })

  it('los banners de comentario quedan como raw', () => {
    const raws = blocks.filter(b => b.kind === 'raw' && !b.flags?.blank)
    expect(raws.length).toBeGreaterThan(0)
    expect(raws.some(b => bib.slice(b.span.from, b.span.to).includes('% ====='))).toBe(true)
  })

  function entry(key: string) {
    const found = blocks.find(b =>
      b.kind === 'bibEntry' && b.fields.some(f => f.name === 'clave' && f.value === key))
    if (!found) throw new Error(`no se encontró la entrada ${key}`)
    return found
  }

  function value(block: { fields: { name: string, value: string }[] }, name: string) {
    return block.fields.find(f => f.name === name)?.value
  }
})

describe('parseBib en casos límite', () => {
  it('cubre el texto entero también cuando hay basura', () => {
    const samples = [
      '',
      '\n\n\n',
      'texto suelto sin ninguna entrada\n',
      '@book{sin-cerrar,\n  title = {roto}\n',
      '@string{acm = {ACM}}\n\n@book{x, title = {y}}\n',
      '@online{pct,\n  url = {https://ej.com/a%20b},\n  note = "con comillas"\n}\n'
    ]
    for (const s of samples) {
      expect(joined(s, parseBib(s))).toBe(s)
    }
  })

  it('una entrada sin cerrar no se traga el archivo: queda como raw', () => {
    const s = '@book{sin-cerrar,\n  title = {roto}\n'
    const blocks = parseBib(s)
    expect(countKind(blocks, 'bibEntry')).toBe(0)
  })

  it('el % de una URL no corta el valor', () => {
    const s = '@online{pct,\n  url = {https://ej.com/a%20b}\n}\n'
    const url = parseBib(s)[0]!.fields.find(f => f.name === 'url')!
    expect(url.value).toBe('https://ej.com/a%20b')
  })

  it('acepta valores entre comillas y desnudos', () => {
    const s = '@article{q, title = "Hola", year = 2019, journal = {X}}\n'
    const fields = parseBib(s)[0]!.fields
    expect(fields.find(f => f.name === 'title')!.value).toBe('Hola')
    expect(fields.find(f => f.name === 'year')!.value).toBe('2019')
  })

  it('acepta valores multilínea y acentos', () => {
    const s = '@book{m,\n  title = {Una línea\n    y otra más},\n  author = {Peña, Ángel}\n}\n'
    const fields = parseBib(s)[0]!.fields
    expect(fields.find(f => f.name === 'title')!.value).toBe('Una línea\n    y otra más')
    expect(fields.find(f => f.name === 'author')!.value).toBe('Peña, Ángel')
  })

  it('ignora una @ dentro de un comentario de línea', () => {
    const s = '% @book{falso, title = {no}}\n@book{real, title = {sí}}\n'
    const blocks = parseBib(s)
    expect(countKind(blocks, 'bibEntry')).toBe(1)
    expect(blocks.find(b => b.kind === 'bibEntry')!.fields[1]!.value).toBe('real')
  })
})
