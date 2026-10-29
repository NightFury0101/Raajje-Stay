/* Interface text in English and Dhivehi (Thaana, right to left).
   Listing descriptions stay in the language the property wrote them in.
   Dhivehi strings are a first draft: have a native speaker review them before launch. */
window.RS_I18N = (function () {
  const en = {
    'nav.home': 'Home', 'nav.stays': 'Stays', 'nav.transfers': 'Transfers', 'nav.trips': 'My trips', 'nav.tripsShort': 'Trips',
    'signin': 'Sign in', 'resident': 'Resident', 'visitor': 'Visitor', 'lang': 'ދިވެހި',
    'hero.eyebrow': '1,192 islands · 26 atolls · one booking',
    'hero.h1a': 'Book the island first.', 'hero.h1b': 'We’ll sort the boat.',
    'hero.lede': 'Guesthouses, resorts, city hotels and apartments across the Maldives, with the speedboat, ferry or seaplane added to the same booking.',
    'who.local': 'I live in the Maldives', 'who.local.s': 'Resident rates in MVR, no Green Tax',
    'who.visit': 'I’m visiting', 'who.visit.s': 'Visitor rates in USD, all taxes shown',
    'chip.all': 'All stays', 'chip.guesthouse': 'Guesthouses', 'chip.resort': 'Resorts', 'chip.hotel': 'City hotels', 'chip.apartment': 'Apartments',
    'search.where': 'Island or atoll', 'search.anywhere': 'Anywhere in the Maldives', 'search.in': 'Check-in', 'search.out': 'Check-out',
    'search.guests': 'Guests', 'search.go': 'Search stays', 'done': 'Done',
    'adults': 'Adults', 'adults.s': '12 and over', 'children': 'Children', 'children.s': '2 to 11', 'infants': 'Infants', 'infants.s': 'Under 2, travel free',
    'types.t': 'Four ways to stay', 'types.p': 'From a family-run guesthouse on Thulusdhoo to a water villa in Baa, each priced for who you are.',
    'board.t': 'Island board', 'board.p': 'Every inhabited island we cover, with the quickest way there from Velana International Airport.',
    'board.atoll': 'Atoll', 'board.island': 'Island', 'board.fastest': 'Fastest from MLE', 'board.stays': 'Stays', 'board.night': 'Per night',
    'allTransfers': 'All transfers', 'rates.t': 'Same room, two prices', 'top.t': 'Highest rated this season', 'seeAll': 'See all', 'faq.t': 'Good to know',
    'perNight': 'per night', 'from': 'from', 'residentsOnly': 'Residents only', 'inclTaxes': 'incl. taxes',
    'filters': 'Filters', 'f.type': 'Type of stay', 'f.max': 'Max price per night', 'f.atoll': 'Atoll', 'f.features': 'Features', 'f.clear': 'Clear filters', 'f.any': 'Any price',
    'sort.rec': 'Recommended', 'sort.price': 'Lowest price', 'sort.rating': 'Top rated',
    'about': 'About', 'here': 'What’s here', 'chooseRoom': 'Choose a room', 'gettingThere': 'Getting there', 'rules': 'House rules', 'reviews': 'Guest reviews',
    'reserve': 'Reserve', 'total': 'Total', 'rooms': 'Rooms', 'left': 'left', 'soldOut': 'Sold out for these dates', 'book': 'Book',
    'co.title': 'Confirm your stay', 'co.details': 'Your details', 'co.getting': 'Getting there', 'co.payment': 'Payment', 'co.confirm': 'Confirm booking',
    'f.name': 'Full name', 'f.mobile': 'Mobile', 'f.email': 'Email', 'f.id': 'National ID card or work permit number', 'f.nat': 'Nationality', 'f.passport': 'Passport number',
    'f.requests': 'Requests for the property', 'optional': 'optional', 'ownTransfer': 'I’ll arrange my own',
    'pay.card': 'Card', 'pay.transfer': 'Bank transfer', 'pay.property': 'Pay at the property', 'payNow': 'Pay now', 'payAtProperty': 'Pay at property',
    'trips.t': 'My trips', 'upcoming': 'Upcoming', 'past': 'Past and cancelled', 'cancel': 'Cancel', 'keep': 'Keep', 'yesCancel': 'Yes, cancel', 'uploadSlip': 'Upload bank slip',
    'st.awaiting_payment': 'Awaiting payment', 'st.slip_review': 'Slip under review', 'st.confirmed': 'Confirmed', 'st.checked_in': 'Checked in',
    'st.checked_out': 'Completed', 'st.no_show': 'No-show', 'st.cancelled': 'Cancelled', 'st.refunded': 'Refunded',
    'tr.title': 'Transfers from Velana', 'tr.to': 'To', 'tr.date': 'Date', 'tr.pax': 'Adults & children', 'tr.inf': 'Infants (free)', 'perPerson': 'per person',
    'lp.nav': 'List your property', 'lp.t': 'List your property on Raajje Stay',
    'foot.tag': 'Rooms, villas and boats across the Maldives, priced for the people who live here and the people who visit.',
    'foot.stay': 'Stay', 'foot.travel': 'Travel', 'foot.partners': 'Partners', 'foot.help': 'Help',
    'foot.dash': 'Property dashboard', 'foot.admin': 'Admin panel'
  };
  const dv = {
    'nav.home': 'މައި ޕެޖެ', 'nav.stays': 'ހުރުމުގެ ތަންތަން', 'nav.transfers': 'ދަތުރު', 'nav.trips': 'އަހަރެންގެ ދަތުރުތައް', 'nav.tripsShort': 'ދަތުރުތައް',
    'signin': 'ސައިން އިން', 'resident': 'ދިވެހި', 'visitor': 'ފަތުރުވެރިޔާ', 'lang': 'English',
    'hero.eyebrow': '1,192 ރަށް · 26 އަތޮޅު · އެއް ބުކިން',
    'hero.h1a': 'ފުރަތަމަ ރަށް ބުކް ކުރައްވާ.', 'hero.h1b': 'އުޅަނދު އަހަރެމެން ހަމަޖައްސާނަން.',
    'hero.lede': 'ދިވެހިރާއްޖޭގެ ގެސްޓްހައުސް، ރިސޯޓު، ހޮޓާ އަދި ފޭރާތޫތައް، ސްޕީޑްބޯޓު، ފެރީ ނުވަތަ ސީޕެއިލާ އެކު އެއް ބުކިން.',
    'who.local': 'އަހަރެން ދިރިއުޅެނީ ދިވެހިރާއްޖޭގައި', 'who.local.s': 'ރުފިޔާއިން އަގު، ގްރީން ޓޭކްސް ނުންގަންތެވޭ',
    'who.visit': 'އަހަރެން އައިސްނަނީ ފަތުރުވެރިއެއްގެ ގޮތުގައި', 'who.visit.s': 'ޑޮލަރުއިން އަގު، ހުރިހާ ޓޭކްސެއް ފެނޭނެ',
    'chip.all': 'ހުރިހާ', 'chip.guesthouse': 'ގެސްޓްހައުސް', 'chip.resort': 'ރިސޯޓު', 'chip.hotel': 'ހޮޓާ', 'chip.apartment': 'ފްލެޓު',
    'search.where': 'ރަށް ނުވަތަ އަތޮޅު', 'search.anywhere': 'ދިވެހިރާއްޖޭގެ ކޮންމެ ތަނެއް', 'search.in': 'އަރާ ދުވަސް', 'search.out': 'ފިއްފާ ދުވަސް',
    'search.guests': 'މެހާނުން', 'search.go': 'ހޯދާ', 'done': 'ނިމުނު',
    'adults': 'ބޮޑެތިން', 'adults.s': '12 އަހަރު ނުވަތަ މަތި', 'children': 'ކުޑަކުދިން', 'children.s': '2 އިން 11 އަށް',
    'infants': 'ތުއްތުކުދިން', 'infants.s': '2 އަހަރުނުވާ، ހިމެނޭ ގޮތުގައި',
    'types.t': 'ހުރެވޭނެ ތަންތަން', 'types.p': 'ގެސްޓްހައުސް، ރިސޯޓު، ހޮޓާ އަދި ފްލެޓު.',
    'board.t': 'ރަށްތައް', 'board.p': 'ވެލާނާ އެއާޕޯޓުން އެންމެ އަވަސް ދާނެ ގޮތު.',
    'board.atoll': 'އަތޮޅު', 'board.island': 'ރަށް', 'board.fastest': 'އެންމެ އަވަސް', 'board.stays': 'ތަންތަން', 'board.night': 'އެއް ރޭ',
    'allTransfers': 'ހުރިހާ ދަތުރު', 'rates.t': 'އެއް ކޮޓަރި، ދެ އަގު', 'top.t': 'އެންމެ މަތީ ރޭޓިންގެ ތަންތަން', 'seeAll': 'ހުރިހާ ބޫން', 'faq.t': 'އެނެއްސެ ކަންތައް',
    'perNight': 'އެއް ރޭއަށް', 'from': 'ފެށޭގޮތަށް', 'residentsOnly': 'ދިވެހިންނަށް ސައްފޭ', 'inclTaxes': 'ޓޭކްސް ހިމެނޭގޮތަށް',
    'filters': 'ފިލްޓަރު', 'f.type': 'ތަނުގެ ވައްތަރު', 'f.max': 'އެއް ރޭގެ އެންމެ މަތީ އަގު', 'f.atoll': 'އަތޮޅު', 'f.features': 'އިތުރު ޖެހުން', 'f.clear': 'ފިލްޓަރު ފޮހޭ', 'f.any': 'ކޮންމެ އަގެއް',
    'sort.rec': 'ބާއްވާ', 'sort.price': 'އެންމެ އަގު އޮޅު', 'sort.rating': 'އެންމެ ރޭޓިންގު މަތި',
    'about': 'ތަނުގެ ސިފަ', 'here': 'މިތަނުގައި ހުރި ލަފާއި', 'chooseRoom': 'ކޮޓަރިއެއް ނަގާ', 'gettingThere': 'ދާނެ ގޮތު', 'rules': 'ގެއެވެ އުސޫލުތައް', 'reviews': 'މެހާނުންގެ ރައުޔު',
    'reserve': 'ބުކް ކުރޭ', 'total': 'ޖުމުލަ', 'rooms': 'ކޮޓަރި', 'left': 'ބާކީ', 'soldOut': 'މި ދުވަސްތައްތަކުގައި ހުރި ކޮޓަރިއެއް ނުން', 'book': 'ބުކް',
    'co.title': 'ބުކިން ކަށަވަރު ކުރޭ', 'co.details': 'ތިޔަބޭގެ މައުލޫމާތު', 'co.getting': 'ދާނެ ގޮތު', 'co.payment': 'ފައިސާ ދެއްކުން', 'co.confirm': 'ބުކިން ކަށަވަރު ކުރޭ',
    'f.name': 'ފުރިހަމަ ނަން', 'f.mobile': 'މޯބައިލް ނަންބަރު', 'f.email': 'އީމެއިލް', 'f.id': 'އައިޑީ ކާޑު ނުވަތަ ވަޒީފާ ހުއްދަތުގެ ނަންބަރު', 'f.nat': 'ކައުމު', 'f.passport': 'ޕާސްޕޯޓު ނަންބަރު',
    'f.requests': 'ތަނުގެ މީހުންނަށް ދޭނެ ތައުލީމު', 'optional': 'އިންތިހާބު', 'ownTransfer': 'ދަތުރު އަމިއްލަށް ހަމައޭލާނަން',
    'pay.card': 'ކާޑު', 'pay.transfer': 'ބޭންކު ޓްރާންސްފަރ', 'pay.property': 'ތަނުގައި ދެއްކުން', 'payNow': 'މިހާރު ދެއްކޭނެ', 'payAtProperty': 'ތަނުގައި ދެއްކޭނެ',
    'trips.t': 'އަހަރެންގެ ދަތުރުތައް', 'upcoming': 'ކުރިއަށް އޮއްވާ', 'past': 'ހަމައެއް ވެފައިވާ', 'cancel': 'ކެންސަލް', 'keep': 'ނުކުރާ', 'yesCancel': 'އާން، ކެންސަލް ކުރޭ', 'uploadSlip': 'ބޭންކު ސްލިޕް އަޕްލޯޑު',
    'st.awaiting_payment': 'ފައިސާ ދެއްކުމަށް', 'st.slip_review': 'ސްލިޕް ބަލަނީ', 'st.confirmed': 'ކަށަވަރު', 'st.checked_in': 'އަރާ',
    'st.checked_out': 'ނިމުނު', 'st.no_show': 'ނުއައިސް', 'st.cancelled': 'ކެންސަލް', 'st.refunded': 'ފައިސާ އަންދުނު',
    'tr.title': 'ވެލާނާއިން ދަތުރު', 'tr.to': 'ދާނެ ތަނަށް', 'tr.date': 'ތާރީޚު', 'tr.pax': 'ބޮޑެތިން އަދި ކުޑަކުދިން', 'tr.inf': 'ތުއްތުކުދިން', 'perPerson': 'މީހަކުށް',
    'lp.nav': 'ތަނު މިތަނަށް ލިސްޓު ކުރޭ', 'lp.t': 'ތަނު ރާއްޖޭ ސްޓޭގައި ލިސްޓު ކުރޭ',
    'foot.tag': 'ދިވެހިންނާއި ފަތުރުވެރިންނަށް އެއްވެސް އަގުގައި ކޮޓަރި، ވިލާ އަދި ދަތުރު.',
    'foot.stay': 'ހުރުމު', 'foot.travel': 'ދަތުރު', 'foot.partners': 'ޕާޓްނަރުން', 'foot.help': 'އެހެން',
    'foot.dash': 'ތަނުގެ ޑޭޝްބޯޑު', 'foot.admin': 'އެޑްމިން'
  };
  let lang = 'en';
  try { lang = localStorage.getItem('rs_lang') || 'en'; } catch (e) { /* default */ }
  const api = {
    get lang() { return lang; },
    t: k => (lang === 'dv' && dv[k]) || en[k] || k,
    set(l) { lang = l; try { localStorage.setItem('rs_lang', l); } catch (e) { /* ignore */ } api.apply(); },
    apply() {
      document.documentElement.lang = lang === 'dv' ? 'dv' : 'en';
      document.documentElement.dir = lang === 'dv' ? 'rtl' : 'ltr';
      document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = api.t(el.dataset.i18n); });
    }
  };
  return api;
})();
