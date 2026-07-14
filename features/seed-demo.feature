Feature: First-run demo seed
  As a first-time visitor with an empty store
  I want the app to load a fictional demo collection
  So that I can explore Tilth before importing my own plants — without ever risking real data

  Background:
    Given the store is completely empty

  Scenario: First run on an empty store seeds the demo nodes
    Given the bundled demo dataset has 3 nodes
    When the app runs its first-run seed
    Then the store holds 3 nodes
    And the data source is marked as demo

  Scenario: A newer demo version refreshes existing demo data
    Given the store holds demo data from an older version
    And the bundled demo dataset has 3 nodes
    When the app runs its first-run seed
    Then the store holds 3 nodes
    And the data source is marked as demo

  Scenario: The seed never clobbers a user's own import
    Given I have imported a node "my-rose"
    And the bundled demo dataset has 3 nodes
    When the app runs its first-run seed
    Then the store holds 1 node
    And node "my-rose" is still present
    And the data source is marked as user-owned
