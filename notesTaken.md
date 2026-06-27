## Intro 
For this project, Phase 1, I had the opportunity to implement a new feature onto Roomly which was the Room Approval Workflow.
As a start, as suggested from the Candidate sheet, I looked over the files which I'd be working on. To get used to the syntax, 
structure of code, and functionality of the app itself, I started reading the files together with Claude in case I couldn't grasp the meaning of something. 

During that process, I understood where everything was stored, commented sections accordingly and started working on Phase 1

## How the app works
Roomly works as follows: 
- A request flows from the page you're looking at, through a small client say "bridge" that makes a HTTP call, to a server route which then reads or writes the data into the JSON files.
- When booking a room, server checks whether the room requires approval, if it does the booking is made as pending waiting for approval, if it doesn't it automatically sets as confirmed.
- A pending booking can't be double booked, but it only becomes confirmed or rejected by an office manager or admin.
- An admin or Manager can approve or reject a booking through the Approvals page, which is only available for them and no employee has access to it.
- Within the Approvals page, there is an approvals queue which they can see all the pending bookings that they can act on. Approving changes the booking to confirmed, just like if the room didn't require approval, whereas rejected frees the slot back up so it can be booked again.
- Everyone has access to a "My Bookings" page clearly giving them feedback on their own bookings with a label that can be Pending, Confirmed, Rejected, Cancelled.
- Pending bookings can also be seen by everyone on the calendar with a different style to differentiate them from confirmed ones.
- Permissions are enforced on the server side, so even if a button would be showing that is not applicable for that user, it wouldn't allow them to go forward if that was clicked.

 ## Tests
 Being unfamiliar with Vitest and how it works, I took some time to understand basic syntax online to understand what I was looking at. These tests, following the ones which were already made, are aimed to test pure logical functions that take inputs and return a result with no server or storage involved.
 - Permission rules are tested using **_canApproveBooking_**, which only an admin or manager for their own office can approve, whereas an employee is denied, including for their own booking.
 - Slot reservations are checked with **_overlaps_**, where a pending booking blocks its slot, and a rejected booking does not as requested from the brief.
 - As a result all first 11 tests, as well the 6 I added pass including after running **_npm run db:reset_**.

 ## What I built
On the server side:
- I added the approval workflow by having a _**requiresApproval**_ flag on rooms, 2 new booking statuses (pending and rejected) and logic so that booking a room needing approval creates a pending booking instead of a confirmed one.
- During the work, I noticed the overlap check and changed it to be an allowlist because i made a mistake when adding the new type of bookings and got problems, so I assumed someone else might do my mistake and therefore changed it to this so the check now only allows for pending and confirmed bookings to reserve a slot, meaning any future status addition defaults to not blocking.
- I added a permission rule **_canApproveBooking_** together with 3 authenticated endpoints: approve, reject, pending list. Together with them I added a separate **_bookings/mine_** route so that a user can fetch their own bookings.
- I decided to make the **_bookings/mine_** on the server rather than fetching everything and then filtering on the client side because that would send all the bookings of everybody through the network, which would be a privacy leak. 
- At first I thought to use _**GET /bookings**_ but i tried to change it to authed and that started causing problems to the calendar, therefore decided keeping it separate was for the best.
On the client side:
- I built an approvals queue page for admins and managers with approve and reject buttons for the bookings they can act on.
- A read only _**my bookings **_ page showing each user their own bookings and statuses such as pending, confirmed, rejected or cancelled.
- I added a reusable StatusBadge component with also status badges on the calendar with pending bookings styled differently, an approval required badge for rooms, as well as navigation based on role (e.g. employees cant access an approvals page).

## What would I have done differently
Imagining I was given say two more weeks, I would definitely learn more about the syntax used for example for typescript, javascript, or even html/css. This came from the fact that the implementation does the job as per the requirements and I didn't hit problems in the testing,
but I'm sure some improvements could be made if I had more knowledge on the syntax. The use of AI was useful on gathering an idea of the platform quicker, since for example I learn faster with drawings and visuals so that helped me understand the architecture better. Also if I had more time, I would change the existing _**GET /bookings**_ by moving it behind an authentication,
since as it stands it returns all booking to any caller authenticated or not just now. I'd then fix everything that comes from it, since right now I saw changing it would create issues with the calendar.
