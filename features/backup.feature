Feature: Save and restore a backup
  As a gardener whose data lives only in this browser
  I want to save a complete backup and restore it
  So that I never lose the plants, links and garden I've built up if the browser clears storage

  Background:
    Given the store starts empty

  Scenario: A backup round-trips every table with provenance intact
    Given I import from "plant-db" a node "rhubarb" with common name "Rhubarb"
    And I have a holding "h1" of "rhubarb"
    When I save a backup
    And I wipe all data
    And I open that backup
    Then node "rhubarb" has common name "Rhubarb"
    And node "rhubarb" provenance for "commonName" is "plant-db"
    And the store holds holding "h1"

  Scenario: Opening a backup replaces whatever is in the store now
    Given I import from "plant-db" a node "rhubarb" with common name "Rhubarb"
    And I have saved a backup
    When I import from "plant-db" a node "tomato" with common name "Tomato"
    And I open that backup
    Then the store has node "rhubarb"
    And the store has no node "tomato"

  Scenario: A restore is a full replace, so a deletion made before it stays gone
    Given I import from "plant-db" a node "rhubarb" with common name "Rhubarb"
    And I import from "plant-db" a node "tomato" with common name "Tomato"
    When I delete node "tomato"
    And I back up then wipe then restore
    Then the store still has node "rhubarb"
    And the store still has no node "tomato"

  Scenario: An unrecognisable file is rejected without touching the store
    Given I import from "plant-db" a node "rhubarb" with common name "Rhubarb"
    When I try to open a backup from "not-a-backup-file"
    Then opening fails
    And the store keeps node "rhubarb"
