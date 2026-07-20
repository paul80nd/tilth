Feature: A month-by-month job list for the plants I grow
  As a gardener
  I want the maintenance jobs for what I actually grow, rolled up and de-duplicated by month
  So that I'm reminded of the tasks I'd otherwise forget (prune, thin, feed) — not the
  self-evident ones (I pick apples when they ripen)

  Background:
    Given the store starts empty
    And an apple species "apple" in category "fruit"
    And cultivars "falstaff,bramley" of "apple"

  Scenario: A maintenance task on the species shows up under each of its months for a held cultivar
    Given I grow "falstaff"
    And a maintenance task "Winter prune" on "apple" in months "11,12,1,2"
    When I list the jobs
    Then "January" includes the job "Winter prune" for "Apple"
    And "December" includes the job "Winter prune" for "Apple"
    And "June" has no jobs

  Scenario: One job de-duplicates across two cultivars of the same species
    Given I grow "falstaff"
    And I grow "bramley"
    And a maintenance task "Winter prune" on "apple" in months "1"
    When I list the jobs
    Then "January" includes the job "Winter prune" for "Apple"
    And "January" has 1 job
    And the job "Winter prune" covers 2 plantings

  Scenario: A condition-based task with no months lands in the anytime bucket
    Given I grow "falstaff"
    And a maintenance task "Water in dry spells" on "apple" in months ""
    When I list the jobs
    Then the anytime list includes "Water in dry spells"
    And "July" has no jobs

  Scenario: Jobs only cover plants I actually grow
    Given a maintenance task "Winter prune" on "apple" in months "1"
    When I list the jobs
    Then "January" has no jobs
