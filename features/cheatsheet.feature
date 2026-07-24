Feature: Cheatsheet inheritance
  As a gardener whose cultivar records are sparse
  I want a cultivar's cheatsheet to inherit its species' details, overriding only what differs
  So that a variety page feels complete without re-entering everything

  Background:
    Given a tomato species with a sparse "Sunny Bench" cultivar

  Scenario: A sparse cultivar inherits its species' calendar
    When I open the cheatsheet for "t-sb"
    Then its calendar is inherited from "tomato"

  Scenario: A cultivar merges its facts with the species' by key
    When I open the cheatsheet for "t-sb"
    Then its facts merge its own with the species' by key

  Scenario: Guidance attached to the species shows on the cultivar
    When I open the cheatsheet for "t-sb"
    Then it shows guide "guide-sow"

  Scenario: A maintenance task attached to the species shows in the cultivar's care
    When I open the cheatsheet for "t-sb"
    Then its care includes the job "Pinch out side shoots"

  Scenario: A plant shows its own award
    When I open the cheatsheet for "tomato"
    Then it shows award "Trial Award"

  Scenario: A cultivar does not inherit its species' award
    When I open the cheatsheet for "t-sb"
    Then it has no awards

  Scenario: A cultivar inherits its species' edibility
    When I open the cheatsheet for "t-sb"
    Then its edible parts are inherited from "tomato"
