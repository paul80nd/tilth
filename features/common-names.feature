Feature: Editable common names
  As a gardener whose collection spans botanical families and genera
  I want to name and pluralise them in plain language
  So that the Taxonomy banners and the family gloss read the way I expect

  Background:
    Given an empty collection

  Scenario: Naming a genus that had no built-in common name
    Given the collection has a genus "Fuchsia"
    When I name the genus "Fuchsia" as "Fuchsia"
    Then the effective common name of the genus "Fuchsia" is "Fuchsia"
    And the saved overrides include the genus "Fuchsia"
    And the store is marked user-owned

  Scenario: Overriding a default then clearing back to it
    When I name the genus "Rosa" as "Shrub rose"
    Then the effective common name of the genus "Rosa" is "Shrub rose"
    When I clear the common name of the genus "Rosa"
    Then the genus "Rosa" falls back to the default "Rose"

  Scenario: An explicit plural feeds the family gloss
    When I name the genus "Rubus" as "Bramble" with the plural "brambles and berries"
    Then the family gloss for the genus "Rubus" is "brambles and berries"

  Scenario: The editor lists the families and genera in the collection
    Given the collection has a family "Rosaceae"
    And the collection has a genus "Fuchsia"
    Then the taxa list includes the genus "Fuchsia"
    And the taxa list includes the family "Rosaceae"
