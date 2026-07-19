import { describeFeature, loadFeature } from '@amiceli/vitest-cucumber'
import { expect } from 'vitest'
import { db } from '../../src/db/db'
import { getCommonNameOverrides, listTaxa, saveCommonName } from '../../src/app/taxonNames'
import { genusCommon, genusGloss } from '../../src/lib/taxonNames'

const feature = await loadFeature('features/common-names.feature')

const slug = (s: string) => s.toLowerCase().replace(/\s+/g, '-')
const addGenus = async (sci: string): Promise<void> => {
  await db.nodes.put({ id: slug(sci), rank: 'genus', botanicalName: sci, genus: sci })
}
const addFamily = async (sci: string): Promise<void> => {
  await db.nodes.put({ id: slug(sci), rank: 'family', botanicalName: sci, family: sci })
}
const effectiveGenus = async (sci: string) => genusCommon(sci, await getCommonNameOverrides())

describeFeature(feature, ({ Background, Scenario }) => {
  Background(({ Given }) => {
    Given('an empty collection', async () => {
      await db.nodes.clear()
      await db.settings.clear()
    })
  })

  Scenario('Naming a genus that had no built-in common name', ({ Given, When, Then, And }) => {
    Given('the collection has a genus {string}', (_, sci: string) => addGenus(sci))
    When('I name the genus {string} as {string}', (_, sci: string, common: string) => saveCommonName('genus', sci, common))
    Then('the effective common name of the genus {string} is {string}', async (_, sci: string, name: string) => {
      expect(await effectiveGenus(sci)).toBe(name)
    })
    And('the saved overrides include the genus {string}', async (_, sci: string) => {
      const ov = await getCommonNameOverrides()
      expect(ov.genera?.[sci]?.common).toBeTruthy()
    })
    And('the store is marked user-owned', async () => {
      expect((await db.settings.get('dataSource'))?.value).toBe('user')
    })
  })

  Scenario('Overriding a default then clearing back to it', ({ When, Then }) => {
    When('I name the genus {string} as {string}', (_, sci: string, common: string) => saveCommonName('genus', sci, common))
    Then('the effective common name of the genus {string} is {string}', async (_, sci: string, name: string) => {
      expect(await effectiveGenus(sci)).toBe(name)
    })
    When('I clear the common name of the genus {string}', (_, sci: string) => saveCommonName('genus', sci, ''))
    Then('the genus {string} falls back to the default {string}', async (_, sci: string, name: string) => {
      expect(await effectiveGenus(sci)).toBe(name)
    })
  })

  Scenario('An explicit plural feeds the family gloss', ({ When, Then }) => {
    When('I name the genus {string} as {string} with the plural {string}', (_, sci: string, common: string, plural: string) =>
      saveCommonName('genus', sci, common, plural),
    )
    Then('the family gloss for the genus {string} is {string}', async (_, sci: string, gloss: string) => {
      expect(genusGloss([sci], await getCommonNameOverrides())).toBe(gloss)
    })
  })

  Scenario('The editor lists the families and genera in the collection', ({ Given, And, Then }) => {
    Given('the collection has a family {string}', (_, sci: string) => addFamily(sci))
    And('the collection has a genus {string}', (_, sci: string) => addGenus(sci))
    Then('the taxa list includes the genus {string}', async (_, sci: string) => {
      expect(await listTaxa()).toContainEqual({ rank: 'genus', sci })
    })
    And('the taxa list includes the family {string}', async (_, sci: string) => {
      expect(await listTaxa()).toContainEqual({ rank: 'family', sci })
    })
  })
})
