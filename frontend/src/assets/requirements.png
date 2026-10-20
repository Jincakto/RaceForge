Create a COMPLETE HIGH-FIDELITY INTERACTIVE WEB APPLICATION PROTOTYPE for:

"RACEHORSE TRAINING & STABLE MANAGEMENT SYSTEM"

This is NOT a static UI design.

The final result must behave like a REAL web application when opened in Figma Present mode.

Every important button, sidebar item, table row, card, tab, form, dropdown, action, modal and navigation item must be interactive and connected to the correct screen.

============================================================
1. TECHNOLOGY
============================================================

Frontend:
React

Backend:
Spring Boot REST API

The Figma prototype represents the React frontend.

Use a structure that can later be implemented with:

- React Router
- Reusable React components
- REST API calls to Spring Boot
- Role-Based Access Control (RBAC)

============================================================
2. SYSTEM PURPOSE
============================================================

This is a management system for a professional horse racing club.

The system manages:

- Racehorses
- Horse profiles
- Horse history
- Pedigree
- Training plans
- Training schedules
- Training sessions
- Training results
- Horse health
- Veterinary records
- Stable care
- Feeding
- Daily tasks
- Staff
- Horse owners
- Race performance
- Reports
- Notifications

Focus on HAPPY CASE workflows first.

Do NOT implement complex edge cases yet.

============================================================
3. USER ROLES
============================================================

Create these roles:

1. Club Manager
2. Head Trainer
3. Trainer
4. Veterinarian
5. Groom / Stable Hand
6. Horse Owner

Each role must have its own dashboard and navigation.

Use Role-Based Access Control.

Users should only see pages and actions allowed for their role.

============================================================
4. AUTHENTICATION
============================================================

Create:

Login Page

There is NO public registration.

Club Manager creates user accounts.

Login fields:

Email
Password
Remember Me

Buttons:

Login
Forgot Password

Login flow:

Login
↓
Authentication
↓
Role Detection
↓
Role Dashboard

For the Figma prototype, allow selecting a role after successful login so that all role dashboards can be demonstrated.

Create:

Role Selection / Demo Role Screen

Options:

Club Manager
Head Trainer
Trainer
Veterinarian
Groom / Stable Hand
Horse Owner

Clicking a role:

→ Navigate to the correct dashboard.

Logout:

→ Navigate to Login.

============================================================
5. GLOBAL APPLICATION LAYOUT
============================================================

All authenticated pages use:

LEFT SIDEBAR
TOP HEADER
MAIN CONTENT

Sidebar:

Logo:
Racehorse Management

Top Header:

Page title
Breadcrumb
Search
Notifications
User avatar
User name
User role

Profile dropdown:

My Profile
Settings
Logout

Global interactions:

Logo
→ Dashboard

Sidebar item
→ Corresponding page

Notification
→ Open notification overlay

Profile
→ Open profile dropdown

Logout
→ Login

Search
→ Search interface / results

============================================================
6. DESIGN STYLE
============================================================

Professional equestrian management SaaS.

Use:

Primary:
Dark Navy

Secondary:
Deep Forest Green

Accent:
Warm Gold

Background:
White / Light Gray

Text:
Dark Gray / Black

Use:

- 8–12px border radius
- Clean cards
- Professional tables
- Subtle shadows
- Clear typography
- Professional horse imagery
- Charts
- Timeline
- Status badges
- Tabs
- Calendar
- Forms

The design should feel:

Professional
Modern
Reliable
Clean
Enterprise-ready

Do NOT make it:

- Gaming
- E-commerce
- Social media
- Cryptocurrency
- Excessively decorative

============================================================
7. DESIGN SYSTEM
============================================================

Create reusable components:

Button
Input
Select
Date Picker
Search Bar
Filter
Table
Table Row
Card
Stat Card
Status Badge
Sidebar
Header
Breadcrumb
Tabs
Modal
Toast
Dropdown
Calendar
Timeline
Chart
Horse Card
Horse Profile Header
Training Card
Medical Record Card

Component states:

Default
Hover
Active
Selected
Disabled
Loading
Success
Error

============================================================
8. CLUB MANAGER DASHBOARD
============================================================

Route:

/manager/dashboard

Dashboard cards:

Total Horses
Eligible Horses
Horses Under Monitoring
Active Training
Total Staff
Monthly Expenses

Create:

Horse Status Overview

Statuses:

Eligible
Monitor
Injured
Isolated

Create:

Recent Horse Activities

Table:

Horse
Activity
Date
Responsible Person
Status

Interactions:

Horse row
→ Horse Detail

Horses sidebar
→ Horse Management

Staff sidebar
→ Staff Management

Reports
→ Reports

============================================================
9. CLUB MANAGER — HORSE MANAGEMENT
============================================================

Route:

/manager/horses

Page:

Horse Management

Features:

Search
Filter
Add Horse
Edit Horse
View Horse

Table:

Horse
Horse ID
Breed
Gender
Date of Birth
Owner
Stable
Health Status
Training Status
Assigned Staff
Actions

Interactions:

Add Horse
→ Add Horse

View
→ Horse Detail

Edit
→ Edit Horse

Horse row
→ Horse Detail

Filter
→ Filter Overlay

============================================================
10. ADD HORSE
============================================================

Route:

/manager/horses/create

Form sections:

Basic Information:

Horse Name
Horse ID
Breed
Gender
Date of Birth
Color
Microchip ID

Ownership:

Horse Owner
Ownership Status

Stable:

Stable
Stall Number
Current Location

Pedigree:

Sire
Dam
Grand Sire
Grand Dam

Responsible Personnel:

Head Trainer
Trainer
Veterinarian
Groom

Buttons:

Cancel
Save Horse

Save:

→ Success Toast
"Horse profile created successfully."

→ Navigate to Horse Detail

Cancel:

→ Horse Management

============================================================
11. HORSE DETAIL
============================================================

Route:

/manager/horses/:id

Horse header:

Horse Photo
Horse Name
Horse ID
Health Status
Training Status

Cards:

Age
Breed
Gender
Owner
Stable
Stall
Health
Training

Tabs:

Overview
Health
Training
Pedigree
Race Results
History

All tabs must be clickable.

Buttons:

Edit Horse
Assign Staff
Back

Edit:

→ Edit Horse

Assign Staff:

→ Staff Assignment

Back:

→ Horse Management

============================================================
12. EDIT HORSE
============================================================

Route:

/manager/horses/:id/edit

Same fields as Add Horse.

Pre-fill existing data.

Buttons:

Cancel
Save Changes

Save:

→ Success Toast

"Horse profile updated successfully."

→ Horse Detail

============================================================
13. STAFF ASSIGNMENT
============================================================

Route:

/manager/horses/:id/assign-staff

Show:

Horse

Head Trainer
Trainer
Veterinarian
Groom

Dropdowns for each role.

Buttons:

Cancel
Save Assignment

Save:

→ Success Toast

"Responsible staff updated successfully."

→ Horse Detail

============================================================
14. HORSE PEDIGREE
============================================================

Create visual pedigree tree:

Horse

Sire
Dam

Grand Sire
Grand Dam

Each node:

Name
Breed
Gender

Click node:

→ Horse information overlay.

============================================================
15. HORSE HISTORY
============================================================

Create chronological timeline.

Events:

Horse Registered
Ownership Updated
Stable Assignment
Staff Assignment
Veterinary Examination
Training Eligibility Confirmation
Training Events
Race Results

Each event:

Date
Event
Description
Responsible Person
Status

Click event:

→ History Detail Overlay

============================================================
16. VETERINARIAN DASHBOARD
============================================================

Route:

/vet/dashboard

Cards:

Total Horses
Eligible
Monitor
Injured
Isolated

Create:

Health Status Overview

Recent Health Reviews

Table:

Horse
Health Status
Last Examination
Veterinarian
Eligibility
Action

Click horse:

→ Veterinary Horse Review

============================================================
17. VETERINARIAN HORSE REVIEW
============================================================

Route:

/vet/horses/:id

Show:

Horse Profile
Owner
Stable
Current Health Status
Latest Examination
Health Summary
Horse History

Training Eligibility section.

Initial state:

Pending Health Confirmation

Button:

Confirm Eligible for Training

Click:

→ Confirmation Modal

Modal:

Confirm Training Eligibility

Message:

"Are you sure this horse is eligible for training?"

Buttons:

Cancel
Confirm

Confirm:

→ Status changes to Eligible

→ Success Toast

"Horse has been confirmed eligible for training."

============================================================
18. VETERINARY MEDICAL RECORD
============================================================

Route:

/vet/medical-records

Create Medical Records page.

Table:

Horse
Examination Date
Veterinarian
Diagnosis
Status
Action

Button:

Create Medical Record

Form:

Horse
Examination Date
Symptoms
Diagnosis
Treatment
Medication
Notes
Follow-up Date

Save:

→ Success Toast

→ Medical Record Detail

This is still HAPPY CASE.

Do not implement complex injury edge cases yet.

============================================================
19. HEAD TRAINER DASHBOARD
============================================================

Route:

/trainer/dashboard

Cards:

Total Horses
Eligible for Training
Active Training
Training Sessions Today
Upcoming Sessions
Horses Requiring Attention

Create:

Fitness Progress Chart

Training Load Chart

Recent Training Activity

Table:

Horse
Training Phase
Last Session
Fitness
Status

Click horse:

→ Trainer Horse Profile

============================================================
20. HEAD TRAINER — HORSE PROFILE
============================================================

Route:

/trainer/horses/:id

Show:

Horse Profile

Health Status
Training Eligibility
Pedigree
History
Fitness Summary

Button:

Create Training Plan

Button:

View Training Profile

Create Training Plan:

→ Training Plan Form

============================================================
21. TRAINING PLAN LIST
============================================================

Route:

/trainer/training-plans

Table:

Horse
Training Phase
Start Date
End Date
Distance
Volume
Surface
Intensity
Assigned Trainer
Status
Actions

Buttons:

Create Training Plan
View
Edit

Interactions:

Create:
→ Create Training Plan

View:
→ Training Plan Detail

Edit:
→ Edit Training Plan

============================================================
22. CREATE TRAINING PLAN
============================================================

Route:

/trainer/training-plans/create

Form:

Horse
Training Phase
Start Date
End Date
Distance
Training Volume
Surface
Intensity
Assigned Trainer
Notes

Training phases:

Preparation
Conditioning
Speed
Race Preparation
Recovery

Buttons:

Cancel
Save Training Plan

Save:

→ Success Toast

"Training plan created successfully."

→ Training Plan Detail

============================================================
23. TRAINING PLAN DETAIL
============================================================

Show:

Horse
Training Phase
Date Range
Distance
Volume
Surface
Intensity
Assigned Trainer
Notes

Create:

Training Progress

Training Sessions

Upcoming Sessions

Buttons:

Edit
Add Training Session
Back

Add Training Session:

→ Training Session Form

============================================================
24. TRAINING CALENDAR
============================================================

Route:

/trainer/schedule

Create interactive calendar.

Views:

Day
Week
Month

Training events:

Horse
Trainer
Time
Training Type
Status

Click event:

→ Training Session Detail

Use:

On Click → Navigate to

============================================================
25. TRAINING SESSION
============================================================

Route:

/trainer/sessions/:id

Show:

Horse
Trainer
Date
Time
Training Type
Distance
Duration
Surface
Intensity
Status
Notes

Buttons:

Start Session
Complete Session
Cancel
Back

Start Session:

→ Status becomes In Progress

Complete Session:

→ Training Result

============================================================
26. TRAINING RESULT
============================================================

Route:

/trainer/results/:id

Form:

Horse
Training Session
Distance
Duration
Average Speed
Maximum Speed
Heart Rate
Performance Rating
Trainer Notes

Buttons:

Save Result
Cancel

Save:

→ Success Toast

"Training result recorded successfully."

→ Training Result Detail

============================================================
27. PERFORMANCE DASHBOARD
============================================================

Route:

/trainer/performance

Create charts:

Fitness Progress
Speed Progress
Training Load
Heart Rate Trend
Training Volume

Filters:

Horse
Date Range
Training Phase

Create professional data visualization.

============================================================
28. TRAINER DASHBOARD
============================================================

Route:

/trainer-user/dashboard

Cards:

Assigned Horses
Sessions Today
Completed Sessions
Upcoming Sessions

Sections:

My Training Schedule
My Training Sessions

Trainer can:

View session
Start session
Complete session
Record result

Click session:

→ Training Session Detail

============================================================
29. GROOM DASHBOARD
============================================================

Route:

/groom/dashboard

Cards:

Assigned Horses
Tasks Today
Completed Tasks
Pending Tasks
Feeding Tasks

Create:

Today's Tasks

Table:

Time
Horse
Task
Location
Status
Action

Tasks:

Feeding
Cleaning Stall
Grooming
Water Refill
Hoof Care
Exercise Preparation

============================================================
30. GROOM — DAILY TASK
============================================================

Route:

/groom/tasks

Each task:

Horse
Task
Time
Assigned By
Status

Buttons:

View
Start
Complete
Report Incident

Start:

→ Status In Progress

Complete:

→ Status Completed

→ Success Toast

"Task completed successfully."

Report Incident:

→ Incident Form

============================================================
31. GROOM — FEEDING
============================================================

Route:

/groom/feeding

Show:

Horse
Feed Type
Quantity
Schedule
Special Notes

Buttons:

View
Confirm Feeding

Confirm:

→ Success Toast

"Feeding completed successfully."

============================================================
32. GROOM — INCIDENT REPORT
============================================================

Route:

/groom/incidents/create

Form:

Horse
Date
Time
Incident Type
Description
Severity
Photo Upload
Notes

Buttons:

Cancel
Submit Report

Submit:

→ Success Toast

"Incident report submitted successfully."

============================================================
33. HORSE OWNER DASHBOARD
============================================================

Route:

/owner/dashboard

Cards:

My Horses
Healthy
Under Monitoring
Active Training
Recent Results

Create:

My Horses section.

IMPORTANT:

Horse Owner can ONLY see horses belonging to the logged-in owner.

Horse cards:

Horse Photo
Horse Name
Horse ID
Breed
Age
Health
Training Status

Button:

View Horse

→ Owner Horse Detail

============================================================
34. HORSE OWNER — HORSE DETAIL
============================================================

Route:

/owner/horses/:id

Read-only page.

Show:

Horse Photo
Horse Name
Horse ID
Breed
Gender
Age
Stable

Tabs:

Overview
Health
Training
Race Results
History

All tabs clickable.

Owner cannot:

Edit Horse
Delete Horse
Assign Staff
Change Health
Change Training
Change Permissions

============================================================
35. OWNER — HORSE HEALTH
============================================================

Show:

Current Health Status
Latest Examination
Veterinarian
Last Check
Health Timeline
Vaccination Summary
Treatment Summary

Read-only.

============================================================
36. OWNER — HORSE TRAINING
============================================================

Show:

Current Training Phase
Training Plan
Training Schedule
Recent Sessions
Fitness Progress
Performance Summary

Read-only.

============================================================
37. OWNER — RACE RESULTS
============================================================

Show:

Race
Date
Position
Distance
Time
Trainer
Performance

Use table.

Click race:

→ Race Result Detail Overlay.

============================================================
38. OWNER — REPORTS
============================================================

Show:

Horse Performance
Training Summary
Health Summary
Monthly Care Cost
Race Results

Use charts and tables.

Read-only.

============================================================
39. CLUB MANAGER — STAFF MANAGEMENT
============================================================

Route:

/manager/staff

Table:

Name
Email
Role
Assigned Horses
Status
Last Login
Actions

Buttons:

Create User
Edit
View

Create User form:

Full Name
Email
Phone
Role
Status

Roles:

Head Trainer
Trainer
Veterinarian
Groom
Horse Owner

Save:

→ Success Toast

"User account created successfully."

============================================================
40. CLUB MANAGER — ROLE & PERMISSION
============================================================

Route:

/manager/roles

Create permission matrix.

Rows:

Horse Management
Training
Health
Stable
Reports
Users
Inventory

Columns:

Manager
Head Trainer
Trainer
Veterinarian
Groom
Owner

Use:

View
Create
Edit
Delete

Display permissions clearly.

============================================================
41. INVENTORY
============================================================

Route:

/manager/inventory

Table:

Item
Category
Quantity
Unit
Minimum Stock
Status
Last Updated

Categories:

Feed
Medical Supplies
Stable Supplies
Equipment

Buttons:

Add Item
Edit
View

============================================================
42. REPORTS
============================================================

Route:

/manager/reports

Create:

Horse Report
Training Report
Health Report
Staff Report
Expense Report

Use charts and tables.

Filters:

Date Range
Horse
Status
Category

============================================================
43. AUDIT LOG
============================================================

Route:

/manager/audit-logs

Table:

Date
User
Role
Action
Entity
Description

Example:

Club Manager
Created Horse
Thunder King

Veterinarian
Confirmed Eligibility
Thunder King

Head Trainer
Created Training Plan
Thunder King

Trainer
Completed Training Session
Thunder King

Use chronological table.

============================================================
44. GLOBAL SEARCH
============================================================

Top header search must be interactive.

Search categories:

Horse
User
Training Session
Medical Record

Example search:

"Thunder King"

Show:

Horse
Horse ID
Health Status
Training Status

Click:

→ Corresponding detail page.

============================================================
45. NOTIFICATIONS
============================================================

Create notification overlay.

Examples:

"Thunder King has been confirmed eligible for training."

"New training session assigned."

"Training result recorded."

"Medical record updated."

"Daily stable task completed."

Click notification:

→ Navigate to related page.

============================================================
46. PROFILE
============================================================

Profile dropdown:

My Profile
Settings
Logout

My Profile:

Name
Email
Role
Assigned responsibilities

Settings:

Notification preferences
Account preferences

Logout:

→ Login

============================================================
47. HAPPY CASE — COMPLETE SYSTEM FLOW
============================================================

The main demo must demonstrate this complete flow:

LOGIN
↓
ROLE SELECTION
↓
CLUB MANAGER DASHBOARD
↓
HORSE MANAGEMENT
↓
HORSE LIST
↓
ADD HORSE
↓
SAVE HORSE
↓
SUCCESS
↓
HORSE DETAIL
↓
ASSIGN STAFF
↓
SAVE ASSIGNMENT
↓
VETERINARIAN DASHBOARD
↓
HORSE HEALTH REVIEW
↓
CONFIRM ELIGIBLE
↓
SUCCESS
↓
HORSE STATUS = ELIGIBLE
↓
HEAD TRAINER DASHBOARD
↓
HORSE PROFILE
↓
CREATE TRAINING PLAN
↓
SAVE TRAINING PLAN
↓
TRAINING PLAN DETAIL
↓
TRAINING SCHEDULE
↓
TRAINING SESSION
↓
START SESSION
↓
COMPLETE SESSION
↓
TRAINING RESULT
↓
SAVE RESULT
↓
PERFORMANCE DASHBOARD
↓
VETERINARIAN
↓
HEALTH UPDATE / MEDICAL RECORD
↓
HORSE OWNER DASHBOARD
↓
MY HORSES
↓
HORSE DETAIL
↓
HEALTH
↓
TRAINING
↓
RACE RESULTS
↓
REPORTS

============================================================
48. GROOM HAPPY CASE
============================================================

Also create this separate connected flow:

GROOM LOGIN
↓
GROOM DASHBOARD
↓
DAILY TASKS
↓
SELECT HORSE
↓
VIEW TASK
↓
START TASK
↓
COMPLETE TASK
↓
SUCCESS
↓
FEEDING
↓
CONFIRM FEEDING
↓
SUCCESS

============================================================
49. TRAINER HAPPY CASE
============================================================

Create:

TRAINER LOGIN
↓
TRAINER DASHBOARD
↓
MY TRAINING SESSIONS
↓
TRAINING SESSION
↓
START
↓
COMPLETE
↓
RECORD RESULT
↓
SAVE
↓
SUCCESS

============================================================
50. OWNER HAPPY CASE
============================================================

Create:

OWNER LOGIN
↓
OWNER DASHBOARD
↓
MY HORSES
↓
HORSE DETAIL
↓
OVERVIEW
↓
HEALTH
↓
TRAINING
↓
RACE RESULTS
↓
REPORTS

Owner pages are READ ONLY.

============================================================
51. PROTOTYPE INTERACTIONS
============================================================

Every important action must work.

Navigation:

On Click → Navigate to

Use Open Overlay for:

- Notifications
- Profile menu
- Filters
- Confirmation modals
- History details
- Pedigree information
- Race details

Use Change To for:

- Active tabs
- Status changes
- Button states
- Task states

Use Back for:

Secondary pages.

============================================================
52. BUTTON BEHAVIOR
============================================================

Add Horse
→ Add Horse

Save Horse
→ Success
→ Horse Detail

Edit
→ Edit Horse

Save Changes
→ Success
→ Horse Detail

Assign Staff
→ Staff Assignment

Save Assignment
→ Success
→ Horse Detail

Confirm Eligibility
→ Confirmation Modal

Confirm
→ Status Eligible

Create Training Plan
→ Training Plan Form

Save Training Plan
→ Training Plan Detail

Create Training Session
→ Training Session

Start Session
→ In Progress

Complete Session
→ Training Result

Save Result
→ Success

Start Groom Task
→ In Progress

Complete Groom Task
→ Completed

Confirm Feeding
→ Success

Create Medical Record
→ Medical Record Form

Save Medical Record
→ Medical Record Detail

Logout
→ Login

============================================================
53. MODALS
============================================================

Create:

Delete Confirmation
Eligibility Confirmation
Success Toast
Error Toast
Notification Panel
Filter Panel
Profile Dropdown
History Detail
Pedigree Detail
Race Detail

============================================================
54. SEARCH AND FILTER
============================================================

All major lists must have:

Search
Filter
Sort

Horse List filters:

Health
Training
Owner
Stable

Training List filters:

Horse
Phase
Trainer
Date
Status

Medical List filters:

Horse
Veterinarian
Health Status
Date

Task List filters:

Horse
Task Type
Status
Date

============================================================
55. RESPONSIVE
============================================================

Desktop first.

Desktop:
1440px

Tablet:
1024px

Mobile:
390px

Desktop:

Expanded sidebar.

Tablet:

Collapsible sidebar.

Mobile:

Hamburger menu.

Tables:

Horizontal scrolling or responsive cards.

Forms:

Single-column on mobile.

============================================================
56. ACCESS CONTROL
============================================================

Club Manager:

Can manage:
Horses
Users
Roles
Inventory
Reports
Audit Logs

Head Trainer:

Can manage:
Training Plans
Training Schedule
Training Results
Performance

Trainer:

Can manage:
Assigned Training Sessions
Training Results

Veterinarian:

Can manage:
Health
Medical Records
Treatments
Vaccinations
Health Status

Groom:

Can manage:
Assigned Daily Tasks
Feeding
Stable Care
Incident Reports

Horse Owner:

Read-only access to owned horses.

============================================================
57. IMPORTANT DATA RELATIONSHIPS
============================================================

Use realistic connected sample data.

Example main horse:

Horse:
Thunder King

Horse ID:
RH-001

Owner:
Nguyen Van A

Head Trainer:
Nguyen Minh

Trainer:
Tran Hoang

Veterinarian:
Dr. An

Groom:
Le Nam

Stable:
Stable A

Stall:
A-12

Health:
Eligible

Training:
Active

All screens must use the SAME horse information.

If Thunder King is created in Horse Management,
the same Thunder King should appear in:

- Veterinary
- Head Trainer
- Trainer
- Groom
- Horse Owner
- Training
- Health
- History
- Reports

This should make the prototype feel like a connected real application.

============================================================
58. HAPPY CASE ONLY
============================================================

Prioritize successful workflows.

Do NOT focus on:

- Injured horse blocking training
- Training lock
- Failed medical examination
- Unauthorized access errors
- Emergency situations
- Failed API calls
- Complex validation
- Race cancellation
- Payment failure

These are EDGE CASES and will be designed later.

============================================================
59. FINAL QUALITY REQUIREMENT
============================================================

The final Figma file must contain:

1. Complete design system
2. Complete navigation
3. Role-based dashboards
4. Horse management
5. Horse profile
6. Horse history
7. Pedigree
8. Staff assignment
9. Veterinary health
10. Medical records
11. Training plans
12. Training schedule
13. Training sessions
14. Training results
15. Performance dashboard
16. Groom tasks
17. Feeding
18. Incident reporting
19. Horse Owner portal
20. Staff management
21. Role permissions
22. Inventory
23. Reports
24. Audit logs
25. Notifications
26. Profile
27. Login
28. Responsive layouts

============================================================
60. MOST IMPORTANT REQUIREMENT
============================================================

DO NOT CREATE A COLLECTION OF DISCONNECTED MOCKUPS.

Create ONE CONNECTED WEB APPLICATION PROTOTYPE.

When the user clicks "Present" in Figma,
they should be able to navigate through the application
like a real website.

The following must work:

LOGIN
→ ROLE
→ DASHBOARD
→ SIDEBAR
→ HORSE
→ HORSE DETAIL
→ STAFF
→ VETERINARY
→ TRAINING
→ SCHEDULE
→ SESSION
→ RESULT
→ HEALTH
→ GROOM
→ OWNER
→ REPORTS
→ LOGOUT
→ LOGIN

Every major screen must have working prototype connections.

Use realistic data.

Use consistent components.

Use professional UX.

Build the prototype as if it will be implemented as a real React + Spring Boot production application.