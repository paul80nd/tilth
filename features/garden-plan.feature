Feature: Plan the garden on a plot of beds
  As a gardener laying out what to grow where
  I want to draw beds and drop plants onto them at their spacing
  So that I can see how many plants I need and where each one goes

  Background:
    Given the store starts empty
    And a plant "tomato" with spread "0.6m"
    And a plant "carrot" with spacing fact "5cm"

  Scenario: Placing a plant on a bed creates a holding with a derived count
    Given a "free" bed "bed1" measuring "1.2" by "0.6"
    When I place "tomato" on "bed1" over the whole bed
    Then the bed holds 1 planting
    And that planting is a holding of "tomato" with quantity 2
    And that planting records its footprint "0.6"

  Scenario: A denser plant yields a higher count over the same area
    Given a "free" bed "bed1" measuring "1.2" by "0.6"
    When I place "carrot" on "bed1" over the whole bed
    Then that planting is a holding of "carrot" with quantity 288

  Scenario: Moving a placement recomputes the count
    Given a "free" bed "bed1" measuring "2" by "2"
    And I have placed "tomato" on "bed1" over the whole bed
    When I move that placement to a region "0.6" by "0.6"
    Then that planting has quantity 1

  Scenario: Overriding the count sticks
    Given a "free" bed "bed1" measuring "1.2" by "0.6"
    And I have placed "tomato" on "bed1" over the whole bed
    When I set the placement quantity to 10
    Then that planting has quantity 10

  Scenario: Removing a bed unplaces its plants but keeps the holdings
    Given a "free" bed "bed1" measuring "1.2" by "0.6"
    And I have placed "tomato" on "bed1" over the whole bed
    When I remove bed "bed1"
    Then there are no beds
    And the store still has the "tomato" holding
    And that holding is no longer placed

  Scenario: The shopping list totals plants across the plot
    Given a "free" bed "bed1" measuring "1.2" by "0.6"
    And a "free" bed "bed2" measuring "1.2" by "0.6"
    And I have placed "tomato" on "bed1" over the whole bed
    And I have also placed "tomato" on "bed2" over the whole bed
    Then the shopping list shows 4 of "tomato"
