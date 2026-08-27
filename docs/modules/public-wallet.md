# Public Wallet

The public wallet is where a user (even a non-signed in user) can access an use a prompt from someone else. I want this to look similar to the users private wallet, but with some changes:

1. Info from the User's profile (see user-profile.md) is displayed so people know who they are getting thier prompt from. for now we can just show the authors "tag" as a prominint heading
2. then we show the the public wallet with the same functiontality as the private wallet but it is read only. users can still open an ai with that prompt tho

I think that is basically it from a UI perspective

From routing I would like to see this:

to see a users public wallet: aicues.web.app/w/<user-tag>

to see a spesific prompt highlighted:  aicues.web.app/w/<user-tag>/<promptId> this would make the UI focus on that prompt, maybe bring up to the top of the page and make it look like it is glowing a little 


