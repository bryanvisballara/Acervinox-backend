export type Product = {
  id: string
  name: string
  category: string
  image: string
  featured?: boolean
}

export const products: Product[] = [
  {
    id: 'cocina',
    name: 'Cocina integral',
    category: 'Línea caliente',
    image: '/products/cocina-integral.png',
    featured: true,
  },
  {
    id: 'estufa',
    name: 'Estufa industrial',
    category: 'Línea caliente',
    image: '/products/estufa.png',
  },
  {
    id: 'freidora',
    name: 'Freidora de canastas',
    category: 'Línea caliente',
    image: '/products/freidora.png',
  },
  {
    id: 'plancha',
    name: 'Plancha a gas',
    category: 'Línea caliente',
    image: '/products/plancha.png',
  },
  {
    id: 'combo',
    name: 'Combo freidora y plancha',
    category: 'Línea caliente',
    image: '/products/combo-freidora.png',
  },
  {
    id: 'asador',
    name: 'Asador industrial',
    category: 'Línea caliente',
    image: '/products/asador.png',
  },
  {
    id: 'hornos',
    name: 'Hornos apilables',
    category: 'Hornos',
    image: '/products/hornos-pizza.png',
  },
  {
    id: 'horno',
    name: 'Horno de cámara',
    category: 'Hornos',
    image: '/products/horno.png',
  },
  {
    id: 'bano-maria',
    name: 'Baño maría',
    category: 'Conservación',
    image: '/products/bano-maria.png',
  },
  {
    id: 'vitrinas',
    name: 'Vitrinas de exhibición',
    category: 'Conservación',
    image: '/products/vitrinas.png',
  },
  {
    id: 'rebanadores',
    name: 'Rebanadores',
    category: 'Preparación',
    image: '/products/rebanadores.png',
  },
  {
    id: 'estacion',
    name: 'Estación de trabajo',
    category: 'Preparación',
    image: '/products/estacion.png',
  },
  {
    id: 'tina',
    name: 'Tina de lavado',
    category: 'Lavado',
    image: '/products/tina.png',
  },
  {
    id: 'exhibidor',
    name: 'Exhibidor inclinado',
    category: 'Exhibición',
    image: '/products/exhibidor.png',
  },
  {
    id: 'pulidoras',
    name: 'Mesas de pulido',
    category: 'Proceso',
    image: '/products/pulidoras.png',
  },
]

export const processSteps = [
  {
    n: '01',
    title: 'Diseño',
    copy: 'Levantamos medidas, flujo de cocina y capacidad. Cada pieza nace en plano.',
  },
  {
    n: '02',
    title: 'Corte',
    copy: 'Acero AISI 304 cortado con precisión milimétrica. Cero desperdicio innecesario.',
  },
  {
    n: '03',
    title: 'Plegado',
    copy: 'Quiebres limpios, radios sanitarios y estructuras que no se deforman.',
  },
  {
    n: '04',
    title: 'Soldadura TIG',
    copy: 'Uniones cerradas, higiénicas y resistentes. El acero queda como una sola pieza.',
  },
  {
    n: '05',
    title: 'Pulido',
    copy: 'Acabado cepillado o espejo. Listo para el ritmo de una cocina profesional.',
  },
]
