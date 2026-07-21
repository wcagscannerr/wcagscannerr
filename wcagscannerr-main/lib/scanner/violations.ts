export interface FixGuide {
  ruleId: string;
  description: string;
  whyItMatters: string;
  fixSteps: string[];
  beforeCode: string;
  afterCode: string;
  wcagCriterion: string;
  wcagLink: string;
}

const FIX_GUIDES: Record<string, FixGuide> = {
  'color-contrast': {
    ruleId: 'color-contrast',
    description: 'Text and background colors do not have sufficient contrast, making content hard to read for users with visual impairments.',
    whyItMatters: 'Low contrast is the #1 WCAG violation, affecting 79.1% of websites. Users with low vision, color blindness, or those viewing in bright sunlight cannot read low-contrast text. This is also the most common target in ADA lawsuits.',
    fixSteps: [
      'Identify the text color and background color of the affected element.',
      'Check the contrast ratio using a tool like WebAIM Contrast Checker.',
      'Adjust either the text or background color until the ratio meets WCAG AA standards: 4.5:1 for normal text, 3:1 for large text (18px+ bold or 24px+ regular).',
      'For AAA compliance, use 7:1 for normal text and 4.5:1 for large text.',
      'Test with a color contrast analyzer to confirm the fix.',
    ],
    beforeCode: '<p style="color: #999; background: #fff;">Hard to read text</p>',
    afterCode: '<p style="color: #595959; background: #fff;">Readable text with 4.5:1 ratio</p>',
    wcagCriterion: '1.4.3',
    wcagLink: 'https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html',
  },
  'image-alt': {
    ruleId: 'image-alt',
    description: 'Images are missing alternative text descriptions, making them invisible to screen readers used by blind and visually impaired users.',
    whyItMatters: '55.5% of websites have missing image alt text. Without alt text, screen reader users cannot understand what images convey. This also hurts SEO and is a frequent target of accessibility lawsuits.',
    fixSteps: [
      'Locate the <img> element identified by the selector.',
      'Add an alt attribute: alt="descriptive text".',
      'Describe the image\'s purpose and content concisely (125 characters or fewer).',
      'If the image is purely decorative, use alt="" (empty string) to tell screen readers to skip it.',
      'Never use file names like alt="photo.jpg" — this provides zero value.',
      'For complex images (charts, infographics), provide a longer description in surrounding text or via aria-describedby.',
    ],
    beforeCode: '<img src="chart.png" />',
    afterCode: '<img src="chart.png" alt="Bar chart showing 40% increase in sales during Q4 2024" />',
    wcagCriterion: '1.1.1',
    wcagLink: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
  },
  'label': {
    ruleId: 'label',
    description: 'Form inputs are missing associated labels, making it impossible for screen reader users to know what information to enter.',
    whyItMatters: '48.2% of websites have missing form labels. Users relying on screen readers cannot fill out forms without labels. This blocks users from registering, purchasing, contacting, or using any form-based feature.',
    fixSteps: [
      'Add a <label> element for each form input.',
      'Use the for attribute on the label that matches the id of the input.',
      'Alternatively, wrap the input inside the <label> element.',
      'Make sure the label text clearly describes what to enter (e.g., "Email Address" not just "Email").',
      'For complex inputs (date pickers, etc.), use aria-label or aria-labelledby as a fallback.',
    ],
    beforeCode: '<input type="text" placeholder="Enter name" />',
    afterCode: '<label for="name">Full Name</label>\n<input type="text" id="name" name="name" placeholder="Enter name" />',
    wcagCriterion: '1.3.1',
    wcagLink: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
  },
  'link-name': {
    ruleId: 'link-name',
    description: 'Links have no readable text, making them unusable for screen reader users who navigate by tabbing through links.',
    whyItMatters: '45.4% of websites have empty links. Screen reader users often navigate by jumping from link to link. If links have no text, they hear "link" with no context — completely useless.',
    fixSteps: [
      'Identify the empty link — it may be an icon-only link, an empty <a> tag, or a link with only an image and no alt text.',
      'If it\'s an icon link (e.g., social media icon), add aria-label="Visit us on Twitter".',
      'If it contains an image, ensure the image has descriptive alt text.',
      'If it\'s a redundant link (same URL as nearby link), consider removing it or using aria-hidden.',
      'Never use invisible text (display:none) — screen readers still see it but it looks broken.',
    ],
    beforeCode: '<a href="/products"><span class="icon-arrow"></span></a>',
    afterCode: '<a href="/products" aria-label="View all products"><span class="icon-arrow" aria-hidden="true"></span></a>',
    wcagCriterion: '2.4.4',
    wcagLink: 'https://www.w3.org/WAI/WCAG21/Understanding/link-purpose-in-context.html',
  },
  'button-name': {
    ruleId: 'button-name',
    description: 'Buttons have no accessible name, making them unusable for screen reader and voice control users.',
    whyItMatters: '29.6% of websites have empty buttons. Buttons without names cannot be identified by screen readers or activated by voice control software (e.g., "Click submit button").',
    fixSteps: [
      'Add visible text inside the <button> element.',
      'For icon-only buttons, add aria-label="Menu" or a descriptive title.',
      'Ensure the button name describes the action: "Submit", "Add to Cart", "Close Modal".',
      'Avoid generic names like "Button" or "Click Here".',
      'For toggle buttons, include the state: aria-pressed="true" and name like "Mute audio".',
    ],
    beforeCode: '<button><span class="icon-close"></span></button>',
    afterCode: '<button aria-label="Close dialog"><span class="icon-close" aria-hidden="true"></span></button>',
    wcagCriterion: '4.1.2',
    wcagLink: 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html',
  },
  'html-has-lang': {
    ruleId: 'html-has-lang',
    description: 'The HTML document is missing a language declaration, preventing screen readers from pronouncing content correctly.',
    whyItMatters: '15.8% of websites lack a language declaration. Screen readers use the lang attribute to select the correct pronunciation rules. Without it, content may be read incorrectly or unintelligibly.',
    fixSteps: [
      'Add a lang attribute to the <html> element.',
      'Use the correct language code: "en" for English, "es" for Spanish, "fr" for French, etc.',
      'For multi-language pages, specify regions: "en-US", "en-GB", "fr-CA".',
      'If you have sections in different languages, use lang attributes on those specific elements.',
    ],
    beforeCode: '<html>',
    afterCode: '<html lang="en">',
    wcagCriterion: '3.1.1',
    wcagLink: 'https://www.w3.org/WAI/WCAG21/Understanding/language-of-page.html',
  },
  'document-title': {
    ruleId: 'document-title',
    description: 'The page is missing a <title> element, making it impossible for users to identify the page purpose.',
    whyItMatters: 'The page title is the first thing a screen reader announces. Without it, users have no idea what page they are on. Titles also appear in browser tabs, bookmarks, and search results.',
    fixSteps: [
      'Add a <title> element inside the <head> section.',
      'Make the title descriptive and unique for each page.',
      'Include the site name, page name, and key context.',
      'Keep titles under 60 characters for best display in search results.',
    ],
    beforeCode: '<head>\n  <meta charset="utf-8">\n</head>',
    afterCode: '<head>\n  <title>Home | My Company</title>\n  <meta charset="utf-8">\n</head>',
    wcagCriterion: '2.4.2',
    wcagLink: 'https://www.w3.org/WAI/WCAG21/Understanding/page-titled.html',
  },
  'aria-required-attr': {
    ruleId: 'aria-required-attr',
    description: 'ARIA roles are missing required attributes, breaking the expected behavior for assistive technologies.',
    whyItMatters: 'Missing ARIA attributes cause widgets to malfunction for screen reader users. A slider without aria-valuenow, a tab without aria-selected — these become invisible or broken.',
    fixSteps: [
      'Check the ARIA role used (e.g., role="slider", role="tab").',
      'Review the ARIA specification for that role to find required attributes.',
      'Add the missing attributes with appropriate values.',
      'Test with a screen reader to confirm the widget now announces correctly.',
    ],
    beforeCode: '<div role="slider" tabindex="0">Volume</div>',
    afterCode: '<div role="slider" tabindex="0" aria-valuenow="50" aria-valuemin="0" aria-valuemax="100" aria-label="Volume">Volume</div>',
    wcagCriterion: '4.1.2',
    wcagLink: 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html',
  },
  'aria-valid-attr': {
    ruleId: 'aria-valid-attr',
    description: 'Invalid or misspelled ARIA attributes are used, causing assistive technologies to ignore them.',
    whyItMatters: 'A typo in an aria attribute (e.g., aria-labelledby vs aria-labeledby) silently breaks the entire element for screen reader users. The attribute is simply ignored with no warning.',
    fixSteps: [
      'Check for typos in the ARIA attribute name.',
      'Compare against the official WAI-ARIA specification.',
      'Common mistakes: "aria-labeledby" should be "aria-labelledby", "aria-hidden" vs "aria-hidden=true".',
      'Use a linter like eslint-plugin-jsx-a11y to catch these at build time.',
    ],
    beforeCode: '<div aria-labeledby="heading1">Content</div>',
    afterCode: '<div aria-labelledby="heading1">Content</div>',
    wcagCriterion: '4.1.2',
    wcagLink: 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html',
  },
  'landmark-one-main': {
    ruleId: 'landmark-one-main',
    description: 'The page does not have a main landmark, making it hard for screen reader users to skip to the primary content.',
    whyItMatters: 'Screen reader users rely on landmarks to navigate quickly. Without a main landmark, they must tab through every navigation link and header before reaching content.',
    fixSteps: [
      'Wrap the primary content area in a <main> element or add role="main" to its container.',
      'There should be exactly one main landmark per page.',
      'Do not nest other landmarks (like <nav> or <footer>) inside <main> unless they are part of the primary content.',
    ],
    beforeCode: '<div id="content">...page content...</div>',
    afterCode: '<main id="content">...page content...</main>',
    wcagCriterion: '1.3.1',
    wcagLink: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
  },
  'page-has-heading-one': {
    ruleId: 'page-has-heading-one',
    description: 'The page does not have a level-one heading, making it difficult for users to understand the page structure.',
    whyItMatters: 'Screen reader users often navigate by jumping between headings. Without an <h1>, they cannot quickly identify the main topic of the page. Headings also help with SEO.',
    fixSteps: [
      'Add an <h1> element that describes the primary topic of the page.',
      'Use exactly one <h1> per page.',
      'The <h1> should appear before other heading levels (h2-h6) in the DOM order.',
      'Make the <h1> text unique across pages on your site.',
    ],
    beforeCode: '<h2>Welcome to Our Site</h2>',
    afterCode: '<h1>Welcome to Our Site</h1>',
    wcagCriterion: '1.3.1',
    wcagLink: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
  },
  'skip-link': {
    ruleId: 'skip-link',
    description: 'The page does not have a skip navigation link, forcing keyboard users to tab through every navigation item.',
    whyItMatters: 'Keyboard-only users must tab through the entire navigation on every page load before reaching content. A "Skip to Content" link saves dozens of tab presses and is a basic accessibility requirement.',
    fixSteps: [
      'Add a "Skip to Content" link as the first focusable element on the page.',
      'Make it visually hidden but visible on focus (using CSS).',
      'Link it to the main content area\'s id attribute.',
      'Ensure it becomes visible when focused so sighted keyboard users see it too.',
    ],
    beforeCode: '<body>\n  <nav>...long navigation...</nav>\n  <main>Content here</main>',
    afterCode: '<body>\n  <a href="#main-content" class="sr-only focus:not-sr-only">Skip to content</a>\n  <nav>...long navigation...</nav>\n  <main id="main-content">Content here</main>',
    wcagCriterion: '2.4.1',
    wcagLink: 'https://www.w3.org/WAI/WCAG21/Understanding/bypass-blocks.html',
  },
  'tabindex': {
    ruleId: 'tabindex',
    description: 'Positive tabindex values are used, creating a confusing and unpredictable tab order for keyboard users.',
    whyItMatters: 'Positive tabindex values (like tabindex="2") force a specific tab order that rarely matches the visual layout. Users get disoriented. Only use tabindex="0" or tabindex="-1".',
    fixSteps: [
      'Replace all occurrences of tabindex with values greater than 0.',
      'Use tabindex="0" to add an element to the natural tab order.',
      'Use tabindex="-1" to make an element focusable via JavaScript only.',
      'Let the DOM order determine the natural tab order — it should match the visual layout.',
    ],
    beforeCode: '<div tabindex="3">First visually</div>\n<div tabindex="1">Second visually</div>',
    afterCode: '<div>First visually</div>\n<div>Second visually</div>',
    wcagCriterion: '2.4.3',
    wcagLink: 'https://www.w3.org/WAI/WCAG21/Understanding/focus-order.html',
  },
  'duplicate-id': {
    ruleId: 'duplicate-id',
    description: 'Multiple elements share the same ID attribute, breaking label associations and anchor links.',
    whyItMatters: 'IDs must be unique. Duplicate IDs break <label for="..."> associations, skip links, and aria-labelledby references. Screen reader users get incorrect or missing information.',
    fixSteps: [
      'Find all elements with the same id value.',
      'Assign unique id values to each element.',
      'Update any references to those IDs (labels, aria attributes, anchor links).',
      'Use a naming convention that ensures uniqueness (e.g., prefix with section name).',
    ],
    beforeCode: '<label for="email">Email 1</label><input id="email">\n<label for="email">Email 2</label><input id="email">',
    afterCode: '<label for="email1">Email 1</label><input id="email1">\n<label for="email2">Email 2</label><input id="email2">',
    wcagCriterion: '4.1.1',
    wcagLink: 'https://www.w3.org/WAI/WCAG21/Understanding/parsing.html',
  },
  'frame-title': {
    ruleId: 'frame-title',
    description: 'Iframes are missing title attributes, leaving screen reader users with no context about embedded content.',
    whyItMatters: 'Screen readers announce the iframe title before entering it. Without a title, users hear "frame" with no indication of what\'s inside. This is especially problematic for embedded forms, maps, or videos.',
    fixSteps: [
      'Add a descriptive title attribute to every <iframe> element.',
      'Describe the content or purpose of the iframe (e.g., "Google Maps showing store location").',
      'For tracking iframes or invisible iframes, use title="empty" or similar.',
    ],
    beforeCode: '<iframe src="https://maps.example.com"></iframe>',
    afterCode: '<iframe src="https://maps.example.com" title="Map showing our office location at 123 Main Street"></iframe>',
    wcagCriterion: '4.1.2',
    wcagLink: 'https://www.w3.org/WAI/WCAG21/Understanding/name-role-value.html',
  },
  'meta-viewport': {
    ruleId: 'meta-viewport',
    description: 'The viewport meta tag disables user scaling, preventing users with low vision from zooming in on content.',
    whyItMatters: 'Many users with low vision rely on browser zoom. Using user-scalable=no or maximum-scale=1.0 blocks this essential feature, effectively locking users out of your content.',
    fixSteps: [
      'Remove user-scalable=no from the viewport meta tag.',
      'Remove maximum-scale=1.0 restriction.',
      'Use the standard responsive viewport: <meta name="viewport" content="width=device-width, initial-scale=1">.',
      'If you must restrict zoom for a specific interface (e.g., a game), ensure an alternative is provided.',
    ],
    beforeCode: '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">',
    afterCode: '<meta name="viewport" content="width=device-width, initial-scale=1">',
    wcagCriterion: '1.4.4',
    wcagLink: 'https://www.w3.org/WAI/WCAG21/Understanding/resize-text.html',
  },
  'heading-order': {
    ruleId: 'heading-order',
    description: 'Heading levels are skipped (e.g., jumping from h1 to h3), breaking the document outline for assistive technology.',
    whyItMatters: 'Headings form the table of contents for screen reader users. Skipping levels (h1 → h3 without h2) confuses the outline and makes navigation unpredictable.',
    fixSteps: [
      'Ensure heading levels don\'t skip: h1 → h2 → h3, not h1 → h3.',
      'If the visual design requires a smaller heading, use CSS (font-size) rather than a different heading level.',
      'Each page should have exactly one h1, followed by h2s for main sections, h3s for subsections.',
    ],
    beforeCode: '<h1>Main Title</h1><h3>Subsection</h3>',
    afterCode: '<h1>Main Title</h1><h2>Subsection</h2>',
    wcagCriterion: '1.3.1',
    wcagLink: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
  },
  'list': {
    ruleId: 'list',
    description: 'List markup is used incorrectly — list items are not inside proper list containers.',
    whyItMatters: 'Screen readers announce the number of items in a list. When <li> elements are not inside <ul> or <ol>, this information is lost, and navigation by list becomes unreliable.',
    fixSteps: [
      'Ensure all <li> elements are inside <ul> (unordered) or <ol> (ordered) elements.',
      'For definition lists, use <dl>, <dt>, and <dd> correctly.',
      'Don\'t use list markup for layout purposes — use CSS instead.',
    ],
    beforeCode: '<div><li>Item 1</li><li>Item 2</li></div>',
    afterCode: '<ul><li>Item 1</li><li>Item 2</li></ul>',
    wcagCriterion: '1.3.1',
    wcagLink: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
  },
  'image-redundant-alt': {
    ruleId: 'image-redundant-alt',
    description: 'Image alt text repeats adjacent text, causing screen readers to announce the same information twice.',
    whyItMatters: 'When alt text duplicates nearby text, screen reader users hear the same content twice, which is confusing and creates unnecessary noise. It also wastes the user\'s time.',
    fixSteps: [
      'If the image is adjacent to text that already describes it, use alt="" (empty string).',
      'Only provide alt text that adds information not already present in nearby text.',
      'For linked images with text, the alt text should describe the link destination, not the image.',
    ],
    beforeCode: '<h3>Our Office</h3><img src="office.jpg" alt="Our Office">',
    afterCode: '<h3>Our Office</h3><img src="office.jpg" alt="">',
    wcagCriterion: '1.1.1',
    wcagLink: 'https://www.w3.org/WAI/WCAG21/Understanding/non-text-content.html',
  },
  'label-title-only': {
    ruleId: 'label-title-only',
    description: 'Form inputs rely only on the title attribute for labeling, which is not adequately supported by all assistive technologies.',
    whyItMatters: 'The title attribute is shown as a tooltip on hover, but many screen readers do not announce it reliably. Some users cannot hover (mobile, keyboard-only). Use a proper <label> element instead.',
    fixSteps: [
      'Replace the title attribute with a visible <label> element.',
      'If a visible label is not desired, use aria-label instead of title.',
      'For search inputs with only a magnifying glass icon, use aria-label="Search".',
    ],
    beforeCode: '<input type="text" title="Search">',
    afterCode: '<label for="search">Search</label><input type="text" id="search">',
    wcagCriterion: '1.3.1',
    wcagLink: 'https://www.w3.org/WAI/WCAG21/Understanding/info-and-relationships.html',
  },
};

export function getFixGuide(ruleId: string): FixGuide | null {
  return FIX_GUIDES[ruleId] || null;
}

export function getFixGuideDescription(ruleId: string): string {
  const guide = FIX_GUIDES[ruleId];
  if (guide) return guide.description;

  if (ruleId === 'color-contrast-enhanced') return 'Text contrast does not meet the enhanced (AAA) contrast requirements.';
  if (ruleId === 'html-lang-valid') return 'The HTML lang attribute value is invalid or uses an unsupported language code.';
  if (ruleId === 'audio-caption') return 'Audio content is missing captions for users who are deaf or hard of hearing.';
  if (ruleId === 'video-caption') return 'Video content is missing captions for users who are deaf or hard of hearing.';
  if (ruleId === 'accesskeys') return 'Accesskey attributes may conflict with assistive technology keyboard shortcuts.';
  if (ruleId === 'area-alt') return 'Image map areas are missing alternative text.';
  if (ruleId === 'aria-allowed-attr') return 'An ARIA attribute is used on an element where it is not allowed.';
  if (ruleId === 'aria-hidden-body') return 'aria-hidden="true" is on the <body> element, hiding all content from assistive technology.';
  if (ruleId === 'blink') return 'The <blink> or <marquee> element is used, which can cause seizures and is not accessible.';
  if (ruleId === 'bypass') return 'The page does not have a mechanism to bypass repeated blocks of content (e.g., skip link).';

  return 'This accessibility violation was detected and should be fixed. See the WCAG documentation for remediation guidance.';
}

export function getAllFixGuides(): Record<string, FixGuide> {
  return FIX_GUIDES;
}