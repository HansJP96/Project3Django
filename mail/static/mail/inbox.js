document.addEventListener('DOMContentLoaded', function () {

  // Use buttons to toggle between views
  document.querySelector('#inbox').addEventListener('click', () => load_mailbox('inbox'));
  document.querySelector('#sent').addEventListener('click', () => load_mailbox('sent'));
  document.querySelector('#archived').addEventListener('click', () => load_mailbox('archive'));
  document.querySelector('#compose').addEventListener('click', compose_email);

  // By default, load the inbox
  load_mailbox('inbox');
});

function compose_email(email) {

  // Show compose view and hide other views
  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#email-content-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'block';

  // Clear out composition fields
  document.querySelector('#compose-recipients').value = email.sender ? email.sender : '';
  document.querySelector('#compose-subject').value = email.subject ? email.subject : '';
  document.querySelector('#compose-body').value = email.body ? email.body : '';


  document.querySelector('#submit-compose').addEventListener('click', send_email)
}

function load_mailbox(mailbox) {

  // Show the mailbox and hide other views
  document.querySelector('#emails-view').style.display = 'block';
  document.querySelector('#email-content-view').style.display = 'none';
  document.querySelector('#compose-view').style.display = 'none';

  // Show the mailbox name
  document.querySelector('#emails-view').innerHTML = `<h3>${mailbox.charAt(0).toUpperCase() + mailbox.slice(1)}</h3>`;
  fetch(`/emails/${mailbox}`)
    .then(response => response.json())
    .then(emails => {
      emails.forEach(email => {
        const email_container = document.createElement('div');
        email_container.classList.add('email-container');
        if (email.read === true) email_container.classList.add('is-read');
        const sender = document.createElement('b');
        const subject = document.createElement('p');
        const date = document.createElement('label');
        sender.innerHTML = email.sender;
        subject.innerHTML = email.subject;
        date.innerHTML = email.timestamp;
        email_container.appendChild(sender);
        email_container.appendChild(subject);
        email_container.appendChild(date);
        if (mailbox !== 'sent') email_container.appendChild(set_archived_view(mailbox, email.id));
        email_container.addEventListener('click', function () {
          view_email(email.id)
        });
        document.querySelector('#emails-view').append(email_container);
      });
    }
    );
}

function view_email(email_id) {

  document.querySelector('#emails-view').style.display = 'none';
  document.querySelector('#email-content-view').style.display = 'block';
  document.querySelector('#compose-view').style.display = 'none';

  fetch(`/emails/${email_id}`)
    .then(response => response.json())
    .then(email => {
      if (email.error) {
        const error_message = document.createElement("h2");
        error_message.innerHTML = email.error;
        const container = document.getElementById('email-content-view');
        container.replaceChildren(error_message);
      } else {
        const reply_btn = document.getElementById("email_reply_btn");
        reply_btn.onclick = () => { compose_reply(email) }
        document.querySelector('#email_sender').innerHTML = email.sender
        document.querySelector('#email_recipients').innerHTML = email.recipients
        document.querySelector('#email_subject').innerHTML = email.subject
        document.querySelector('#email_timestamp').innerHTML = email.timestamp
        document.querySelector('#email_body').innerHTML = email.body
      }
    });
  update_read_state(email_id)
}

function send_email(event) {
  event.preventDefault();
  fetch('/emails', {
    method: 'POST',
    body: JSON.stringify({
      recipients: document.querySelector('#compose-recipients').value,
      subject: document.querySelector('#compose-subject').value,
      body: document.querySelector('#compose-body').value
    })
  })
    .then(response => {
      return response.json();
    })
    .then(result => {
      if (result.error) {
        document.getElementById('compose-recipients').classList.add('is-invalid');
        document.getElementById('recipient-error').innerHTML = result.error;
      }
      else load_mailbox('inbox');
      console.log(result);
    }).catch(err => {
      console.error(err);
    })
}

function update_read_state(email_id) {
  fetch(`/emails/${email_id}`, {
    method: 'PUT',
    body: JSON.stringify({
      read: true
    })
  })
    .then(response => {
      if (response.ok) console.log('Updated read !!!')
    })
}

function set_archived_view(mailbox, email_id) {
  const archived_icon = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" class="bi bi-archive-fill" viewBox="0 0 16 16">
        <path d="M12.643 15C13.979 15 15 13.845 15 12.5V5H1v7.5C1 13.845 2.021 15 3.357 15zM5.5 7h5a.5.5 0 0 1 0 1h-5a.5.5 0 0 1 0-1M.8 1a.8.8 0 0 0-.8.8V3a.8.8 0 0 0 .8.8h14.4A.8.8 0 0 0 16 3V1.8a.8.8 0 0 0-.8-.8z"/>
        </svg>`
  const unarchived_icon = `<svg xmlns="http://www.w3.org/2000/svg" width="25" height="25" fill="currentColor" class="bi bi-arrow-bar-up" viewBox="0 0 16 16">
        <path fill-rule="evenodd" d="M8 10a.5.5 0 0 0 .5-.5V3.707l2.146 2.147a.5.5 0 0 0 .708-.708l-3-3a.5.5 0 0 0-.708 0l-3 3a.5.5 0 1 0 .708.708L7.5 3.707V9.5a.5.5 0 0 0 .5.5m-7 2.5a.5.5 0 0 1 .5-.5h13a.5.5 0 0 1 0 1h-13a.5.5 0 0 1-.5-.5"/>
      </svg>`
  const archived = document.createElement('button');
  archived.innerHTML = mailbox == 'inbox' ? archived_icon : unarchived_icon;
  archived.addEventListener('click', function (event) {
    archived.blur();
    event.stopPropagation();
    update_archive_state(mailbox, email_id);
    location.reload();
  });
  return archived;
}

function update_archive_state(mailbox, email_id) {
  fetch(`/emails/${email_id}`, {
    method: 'PUT',
    body: JSON.stringify({
      archived: mailbox == 'inbox' ? true : false
    })
  })
    .then(response => {
      if (response.ok) console.log('Updated archived !!!');
    })
}

function compose_reply(email) {
  const response_sender = document.querySelector('#email_sender_input').value
  if (!email.subject.startsWith('Re:')) {
    email.subject = 'Re: '.concat(email.subject);
    email.body = `On ${email.timestamp} ${email.sender} wrote:\n${email.body.replace('/\n/g', '\t\n')}\n=========\nResponse from ${response_sender}:\n`;
  } else {
    email.body = `${email.body}\n=========\nResponse from ${response_sender}:\n`;
  }
  compose_email(email);
}