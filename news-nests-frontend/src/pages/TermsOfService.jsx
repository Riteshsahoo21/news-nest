import LegalPage from './LegalPage';
import { Scale } from 'lucide-react';

export default function TermsOfService() {
  return (
    <LegalPage
      title="Terms of Service"
      updated="October 23, 2026"
      icon={Scale}
      intro="These terms cover your use of RitzlaNews, including its news feed, accounts, and community features. By using the site, you agree to follow them."
      sections={[
        {
          heading: 'Using the service',
          body: <p>Use RitzlaNews lawfully and do not disrupt the site, attempt unauthorized access, misuse another person’s account, or interfere with other readers. Some features require an account or may be unavailable in certain regions.</p>
        },
        {
          heading: 'Accounts and submissions',
          body: <p>Keep your account details accurate and protect your sign-in credentials. You are responsible for material you submit and should only submit content you have the right to share. Submissions may be reviewed, moderated, or removed under the site’s editorial and safety practices.</p>
        },
        {
          heading: 'News and external sources',
          body: <p>News may be updated, corrected, delayed, or removed. Some stories and media come from third-party publishers; their availability and content are controlled by those publishers. Links to outside sites are provided for reference and are subject to those sites’ terms and privacy practices.</p>
        },
        {
          heading: 'No professional advice',
          body: <p>News and commentary on the site are provided for general information. They are not legal, medical, financial, or other professional advice. Make decisions using qualified advice appropriate to your situation.</p>
        },
        {
          heading: 'Availability and changes',
          body: <p>We may change, suspend, or discontinue features to maintain or improve the service. We may update these terms when the service or its requirements change; the latest version will be posted on this page with its updated date.</p>
        },
        {
          heading: 'Contact',
          body: <p>Questions about these terms can be sent to <a className="font-medium text-primary underline underline-offset-4" href="mailto:support@newsnest.com">support@newsnest.com</a>.</p>
        }
      ]}
    />
  );
}
