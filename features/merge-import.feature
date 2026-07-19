Feature: Merge-import plant fragments
  As a gardener filling a plant's cheatsheet from several sources over time
  I want each import to overlay only the fields it supplies, and remember where each came from
  So that botanical facts from one source and sowing details from another build one record
  without clobbering each other

  Background:
    Given the store starts empty

  Scenario: A second source fills absent fields and leaves present ones alone
    Given I import from "plant-db" a node "rose" with:
      | commonName | botanicalName |
      | Rose       | Rosa gallica  |
    When I import from "seed-packet" a node "rose" with:
      | facts.sowing depth |
      | 1cm                |
    Then node "rose" has commonName "Rose"
    And node "rose" has botanicalName "Rosa gallica"
    And node "rose" fact "sowing depth" is "1cm"

  Scenario: The same field from a later source overwrites (last import wins)
    Given I import from "plant-db" a node "rose" with:
      | commonName |
      | Rose       |
    When I import from "seed-packet" a node "rose" with:
      | commonName  |
      | Garden Rose |
    Then node "rose" has commonName "Garden Rose"

  Scenario: Provenance records which source last set each field
    Given I import from "plant-db" a node "rose" with:
      | commonName | botanicalName |
      | Rose       | Rosa gallica  |
    When I import from "seed-packet" a node "rose" with:
      | commonName  |
      | Garden Rose |
    Then node "rose" field "botanicalName" came from "plant-db"
    And node "rose" field "commonName" came from "seed-packet"

  Scenario: Array fields replace wholesale, they do not union
    Given I import from "plant-db" a node "rose" with soil "clay, loam"
    When I import from "seed-packet" a node "rose" with soil "sand"
    Then node "rose" soil is "sand"

  Scenario: Two sources fill different facets of the same conditions object (deep-merge)
    Given I import from "plant-db" a node "rose" with soil "clay"
    When I import from "seed-packet" a node "rose" with moisture "moist"
    Then node "rose" soil is "clay"
    And node "rose" moisture is "moist"

  Scenario: A later source adds a fact without clobbering the earlier facts (deep-merge)
    Given I import from "plant-db" a node "rose" with:
      | facts.harvest |
      | July          |
    When I import from "seed-packet" a node "rose" with:
      | facts.sowing depth |
      | 1cm                |
    Then node "rose" fact "harvest" is "July"
    And node "rose" fact "sowing depth" is "1cm"

  Scenario: A multi-valued life cycle imports whole and a later partial import leaves it alone
    Given I import from "plant-db" a node "tomato" with lifecycle "annual, perennial"
    When I import from "seed-packet" a node "tomato" with:
      | facts.sowing depth |
      | 1cm                |
    Then node "tomato" lifecycle is "annual, perennial"

  Scenario: An import marks the store user-owned so the demo re-seed cannot clobber it
    When I import from "plant-db" a node "rose" with:
      | commonName |
      | Rose       |
    Then the data source is marked as user-owned

  Scenario: Guides and tasks are upserted whole, with provenance
    When I import from "plant-db" a guide "g1" titled "Pruning roses"
    And I import from "plant-db" a task "t1" to "Deadhead"
    Then the store holds guide "g1" titled "Pruning roses"
    And the store holds task "t1"
    And guide "g1" came from "plant-db"
