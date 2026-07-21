Feature: Warn when a crop family repeats in a bed too soon
  As a gardener planning next year's beds
  I want to be warned when I put the same botanical family back in a bed too soon
  So that I keep a healthy rotation without tracking families by hand

  Background:
    Given the store starts empty
    And a veg "cabbage" in family "Brassicaceae"
    And a cultivar "kale" of "cabbage"
    And another veg "carrot" in family "Apiaceae"
    And a perennial veg "rhubarb" in family "Polygonaceae"
    And a fruit "apple" in family "Rosaceae"
    And a "free" bed "bed1" measuring "1.2" by "0.6"

  Scenario: The same family two years running is flagged
    Given "cabbage" placed on "bed1" in 2025
    And "kale" placed on "bed1" in 2026
    When I check rotation for 2026
    Then "bed1" is warned
    And the warning names family "Brassicaceae" last grown in 2025

  Scenario: A different family following on is fine
    Given "cabbage" placed on "bed1" in 2025
    And "carrot" placed on "bed1" in 2026
    When I check rotation for 2026
    Then "bed1" is not warned

  Scenario: A rest longer than the window clears the warning
    Given "cabbage" placed on "bed1" in 2022
    And "cabbage" placed on "bed1" in 2026
    When I check rotation for 2026
    Then "bed1" is not warned

  Scenario: Perennials never trigger a rotation warning
    Given "apple" placed on "bed1" in 2025
    And "apple" placed on "bed1" in 2026
    When I check rotation for 2026
    Then "bed1" is not warned

  Scenario: A container bed never warns — pots get fresh compost each year
    Given "cabbage" placed on a "container" bed "pot" in 2025
    And "cabbage" placed on "pot" in 2026
    When I check rotation for 2026
    Then "pot" is not warned

  Scenario: A perennial-only veg is exempt
    Given "rhubarb" placed on "bed1" in 2025
    And "rhubarb" placed on "bed1" in 2026
    When I check rotation for 2026
    Then "bed1" is not warned

  Scenario: Rolling a year forward seeds next year and surfaces the clash
    Given "cabbage" placed on "bed1" in 2025
    When I roll the 2025 plot over into 2026
    Then "bed1" holds 1 planting for 2026
    And that 2026 planting is planned
    When I check rotation for 2026
    Then "bed1" is warned
    And the warning names family "Brassicaceae" last grown in 2025

  Scenario: Roll-over will not clobber a year that already has plantings
    Given "cabbage" placed on "bed1" in 2025
    And "carrot" placed on "bed1" in 2026
    When I roll the 2025 plot over into 2026
    Then "bed1" holds 1 planting for 2026
