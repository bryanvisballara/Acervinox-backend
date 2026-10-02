import { CatalogProduct } from '../models/CatalogProduct.js'
import { DEFAULT_CATALOG_PRODUCTS } from '../data/catalogProducts.js'

function keyOf(item) {
  return `${item.origin}|${String(item.name || '').trim().toLowerCase()}`
}

export async function seedCatalogProducts() {
  const existing = await CatalogProduct.find({}, 'name origin').lean()
  const have = new Set(existing.map(keyOf))
  const missing = DEFAULT_CATALOG_PRODUCTS.filter((item) => !have.has(keyOf(item)))
  if (missing.length) {
    await CatalogProduct.insertMany(missing, { ordered: false }).catch((err) => {
      if (err?.code !== 11000) throw err
    })
    console.log(`Catálogo: ${missing.length} productos nuevos`)
  }
  const total = await CatalogProduct.countDocuments()
  console.log(`Catálogo: ${total} productos en total`)
}
