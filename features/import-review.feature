Feature: Diff-review import
  As a gardener enriching a plant from a source fragment
  I want to see, per field, what an import would change and untick anything to exclude
  So that I apply only the parts I want, without a backup round-trip

  Background:
    Given the store starts empty

  Scenario: The review classifies each incoming field as new, changed or unchanged
    Given a node "rose" exists with commonName "Rose" and family "Rosaceae"
    When I build an import review from a "plant-db" fragment for "rose" with:
      | commonName | family | genus |
      | Rose       | Rosids | Rosa  |
    Then the import review for "rose" shows:
      | field      | status  |
      | commonName | same    |
      | family     | changed |
      | genus      | new     |

  Scenario: Applying a selection merges only the ticked fields, leaving the rest alone
    Given a node "rose" exists with commonName "Rose" and family "Rosaceae"
    When I build an import review from a "plant-db" fragment for "rose" with:
      | family | genus |
      | Rosids | Rosa  |
    And I apply the review keeping only "genus" for "rose"
    Then node "rose" has genus "Rosa"
    And node "rose" has family "Rosaceae"

  Scenario: A brand-new node is marked new and imports in full
    When I build an import review from a "plant-db" fragment for "tulip" with:
      | commonName | family    |
      | Tulip      | Liliaceae |
    Then the review marks "tulip" as new
    When I apply the review keeping only "commonName, family" for "tulip"
    Then node "tulip" has commonName "Tulip"
    And node "tulip" has family "Liliaceae"

  Scenario: The store is marked user-owned once an import is applied
    When I build an import review from a "plant-db" fragment for "tulip" with:
      | commonName |
      | Tulip      |
    And I apply the review keeping only "commonName" for "tulip"
    Then the data source is marked as user-owned
