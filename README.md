# Portalsend

Dead simple end-to-end encrypted file sharing for everyone.

## TODO

### Blocking Launch

- Impose a 7-day file limit and also tell users about it
  - In email
  - On file page
  - On other page
- Fix privacy policy receive information from third parties, because we receive information from github/google/etc.
- Remove the close button from the Choose master password dialog.
- Disable send button when there is a bad email in the bunch.
- Store the IP Address of each user so that we can identify problem users in the future (does this require a privacy policy?)
- Improve SEO.
- Have users agree to Privacy Policy when signing up. And make sure they're above 18.
- Implement contact form based on privacy policy.
- Block users outside of US for now.
- Use crystals-kyber: https://github.com/antontutoveanu/crystals-kyber-javascript
- Store encryption algorithm of stored shared keys and of stored public keys
- Enforce type imports using eslint
- Only allow 5 recipients (frontend recipient email inputs and backend validation)

### After Launch

- Implement "Remove and Invite"
- Reset password
  - When the user resets their master password, delete all of the user's FileAccesses (or set deletedAt on them) so that the files don't show up in the user's file tables and so that it doesn't look like the user has access to the files on each file slug url.
- When the user resets their master password using their existing password, download and re-encrypt all of the files that they have OWNER access to. Set deletedAt on every fileAccess that they do not have OWNER access on.
- Let users edit the recipients of a file.
- Require captcha before the user can check for the existence of another user's email address.
- Present the dropzone immediately and have the user create their account as part of the
- When decrypting a file to download it, show "Decrypting filename", then "Decrypting 'the filename'"
- Add carbon ads
- Come up with a paid account. Here are some ideas:
  - Remove user's access to files 7 days after they're sent unless the user is on a paid account. Can probably implement this simply by not letting the user get a presigned link to a file that is more than 7 days old. Don't actually delete the files from S3 and let the user recover all of their old files by upgrading to a paid account.
  - Have a 5mb limit per file unless the user is on a paid account
  - Have a 1gb limit per user unless the user is on a paid account - not sure how this interacts with files that are older than 7 days.
- Consider using a separate s3 "directory" for each SharedKey so that we can easily list the files that S3 has for a user.
- Remove the possibility of "dangling" files in our Files table. These would be created when we create a signed upload url, but the frontend doesn't follow through with the file upload to S3, possibly due to an encryption of file upload error. This is important both from a cleanliness perspective and to make sure that when we display the user's past file uploads, we only show ones that we can actually download.
- Caching on pages and routes, understand revalidate etc.
  - Mimic stale-while-revalidate
- Add more links to homepage
- Figure out why polyfills are being served to chrome
- Create a dedicated "Get Started" page which can be accessed using a "Get Started" callout at the top right of the homepage.
  - Have the user enter their name and master password before they can click "Authenticate".
  - When the user enters their name and password and clicks authenticate, first create a temporary user record for them, then
    initiate the next-auth oath flow through google or github. When the user returns to our site, get their session. If the getSession
    endpoint cannot find a user, check the temporary users table. If there is a temporary user for this user in the table, create a real
    user for this user
  - The above flow will have to be modified: we need make sure we continue to verify ownership of an email address using oauth.
- Show error messages when files fail to be decrypted or whatever. Indicate when teh problem is that the master password is wrong.
  Can start by just showing an X on the step that failed and checks on the steps that succeed.
- More server components and fewer client-side requests.
