import { describe, it, expect } from 'vitest'
import { housesData, bathsData, galleryCategories } from './catalogData'

describe('catalogData', () => {
  it('housesData contains valid project objects', () => {
    expect(housesData.length).toBeGreaterThan(0)
    for (const house of housesData) {
      expect(house.id).toBeTruthy()
      expect(house.title).toBeTruthy()
      expect(house.area).toMatch(/м²/)
      expect(house.price).toBeTruthy()
      expect(house.description).toBeTruthy()
      expect(Array.isArray(house.images)).toBe(true)
      expect(house.images.length).toBeGreaterThan(0)
    }
  })

  it('bathsData contains valid project objects with images', () => {
    expect(bathsData.length).toBeGreaterThan(0)
    for (const bath of bathsData) {
      expect(bath.id).toBeTruthy()
      expect(bath.title).toBeTruthy()
      expect(bath.area).toMatch(/м²/)
      expect(bath.price).toBeTruthy()
      expect(bath.description).toBeTruthy()
      expect(Array.isArray(bath.images)).toBe(true)
      expect(bath.images.length).toBeGreaterThan(0)
    }
  })

  it('galleryCategories contains required category lists', () => {
    expect(galleryCategories).toHaveProperty('utility')
    expect(galleryCategories).toHaveProperty('gazebos')
    expect(galleryCategories).toHaveProperty('swings')
    expect(galleryCategories).toHaveProperty('complexes')
    expect(galleryCategories).toHaveProperty('foundations')

    // utility and foundations should be empty
    expect(galleryCategories.utility).toEqual([])
    expect(galleryCategories.foundations).toEqual([])

    // gazebos should have 4 photos from besed
    expect(galleryCategories.gazebos).toEqual([
      '/photos/besed/1.jpg',
      '/photos/besed/2.jpg',
      '/photos/besed/3.jpg',
      '/photos/besed/4.jpg'
    ])

    // swings should have 5 photos from bed
    expect(galleryCategories.swings).toEqual([
      '/photos/bed/1.jpg',
      '/photos/bed/2.jpg',
      '/photos/bed/3.jpg',
      '/photos/bed/4.jpg',
      '/photos/bed/5.jpg'
    ])

    // complexes should have 1 photo from kompl
    expect(galleryCategories.complexes).toEqual([
      '/photos/kompl/1.jpg'
    ])
  })
})
