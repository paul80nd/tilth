Feature: Browse the plant knowledge base
  As a gardener with a record of plants
  I want to browse everything I hold, by what I call it, and narrow by category or botany
  So that I can quickly find a plant's cheatsheet

  Background:
    Given the record holds a family, two tomatoes and a basil

  Scenario: Browse cards only the plants you look up, not higher taxonomy
    When I browse with no filters
    Then I see plants "basil, tomato, t-sb"

  Scenario: Filter by category
    When I browse the category "herb"
    Then I see plants "basil"

  Scenario: Search by variety name
    When I search browse for "sunny"
    Then I see plants "t-sb"

  Scenario: Search by botanical name
    When I search browse for "solanum"
    Then I see plants "tomato, t-sb"
