/**
 * El icono de un bloque, que en el catálogo va por nombre.
 *
 * Se busca en `lucide` en vez de importar veinte iconos a mano: los nombres
 * salen de `catalog.ts`, y ahí añadir un bloque no debería obligar a tocar
 * también la lista de imports de dos componentes.
 */
import * as lucide from 'lucide-vue-next'
import { Braces, type LucideIcon } from 'lucide-vue-next'

/** Si el nombre no existe —o no hay nombre—, se ve el genérico. */
export function iconOf(name: string | undefined): LucideIcon {
  return (lucide as unknown as Record<string, LucideIcon>)[name ?? ''] ?? Braces
}
