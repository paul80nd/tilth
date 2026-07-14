Feature: Cheatsheet inheritance
  As a gardener whose cultivar records are sparse
  I want a cultivar's cheatsheet to inherit its species' details, overriding only what differs
  So that a variety page feels complete without re-entering everything

  Background:
    Given a tomato species with a sparse "Sunny Bench" cultivar

  Scenario: A sparse cultivar inherits its species' calendar
    When I open the cheatsheet for "t-sb"
    Then its calendar is inherited from "tomato"

  Scenario: A cultivar keeps its own fields rather than the species'
    When I open the cheatsheet for "t-sb"
    Then its facts are its own, not inherited

  Scenario: Guidance attached to the species shows on the cultivar
    When I open the cheatsheet for "t-sb"
    Then it shows guide "guide-sow"

  Scenario: A plant shows its own award
    When I open the cheatsheet for "tomato"
    Then it shows award "Trial Award"

  Scenario: A cultivar does not inherit its species' award
    When I open the cheatsheet for "t-sb"
    Then it has no awards
