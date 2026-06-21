import './style.css'

// "Email" copies the address to the clipboard (with a brief confirmation),
// falling back to a mailto: link. The address is assembled at runtime so it
// isn't sitting in the markup for scrapers.
const link = document.querySelector<HTMLAnchorElement>('.email-link')

if (link) {
  const email = ['adam', 'adamparsons', 'me'].join('@').replace('@me', '.me')
  let revert: number | undefined

  const openMail = (): void => {
    window.location.href = `mailto:${email}`
  }

  const showCopied = (): void => {
    link.textContent = 'Copied'
    link.classList.add('is-copied')
    if (revert) window.clearTimeout(revert)
    revert = window.setTimeout(() => {
      link.textContent = 'Email'
      link.classList.remove('is-copied')
    }, 1500)
  }

  link.addEventListener('click', (e) => {
    e.preventDefault()
    if (navigator.clipboard) {
      navigator.clipboard.writeText(email).then(showCopied).catch(openMail)
    } else {
      openMail()
    }
  })
}
