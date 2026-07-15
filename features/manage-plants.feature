Feature: Manage plant records by hand
  As a gardener building up my plant record
  I want to add plants, link the pages to enrich them from, and edit or delete them
  So that I have a record to grow — and an acquire can later fill each plant from its linked
  source without clobbering anything I typed myself

  Background:
    Given the store starts empty

  Scenario: Adding a plant stamps its fields as hand-entered and protects the store
    When I add a plant "rhubarb" with commonName "Rhubarb"
    Then node "rhubarb" has commonName "Rhubarb"
    And node "rhubarb" field "commonName" came from "manual"
    And the data source is marked as user-owned

  Scenario: Linking a source records the page to enrich the plant from later
    When I add a plant "rhubarb" linking "plant-db" to "https://example.invalid/rhubarb"
    Then node "rhubarb" has a source link to "https://example.invalid/rhubarb" for "plant-db"

  Scenario: Editing one field re-stamps only that field, preserving an acquired field
    Given I import from "plant-db" a node "rhubarb" with:
      | botanicalName    |
      | Rheum x hybridum |
    When I edit node "rhubarb" setting commonName "Rhubarb"
    Then node "rhubarb" has commonName "Rhubarb"
    And node "rhubarb" commonName is now sourced from "manual"
    And node "rhubarb" botanicalName is still sourced from "plant-db"

  Scenario: A no-op edit leaves the field's provenance alone
    Given I import from "plant-db" a node "rhubarb" with:
      | commonName |
      | Rhubarb    |
    When I edit node "rhubarb" setting commonName "Rhubarb"
    Then node "rhubarb" field "commonName" came from "plant-db"

  Scenario: Deleting a plant removes it from the store
    Given I import from "plant-db" a node "rhubarb" with:
      | commonName |
      | Rhubarb    |
    When I delete node "rhubarb"
    Then the store has no node "rhubarb"
