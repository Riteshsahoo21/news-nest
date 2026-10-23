import LegalPage from './LegalPage';
import { ShieldCheck } from 'lucide-react';

export default function PrivacyPolicy() {
  return (
    <LegalPage
      title="Privacy Policy"
      updated="October 23, 2026"
      icon={ShieldCheck}
      intro="This policy explains what information RitzlaNews may use to operate the news site and how you can control some of that use."
      sections={[
        {
          heading: 'Information you provide',
          body: <p>When you create or use an account, submit a report, comment, or contact support, we use the details and content you provide to deliver those features. Your public profile and contributions may be visible to other visitors where the product displays them.</p>
        },
        {
          heading: 'Location and local news',
          body: <p>If you choose the Near Me feature and grant your browser permission, the site uses your device location to look for local stories. You can deny or revoke location permission in your browser; the feature will then be unavailable until permission is granted.</p>
        },
        {
          heading: 'How information is used',
          body: <p>Information is used to provide the news feed and account features, remember your interactions, moderate submitted material, protect the service, and diagnose technical problems. We do not use your location for Near Me unless you request that feature and grant permission.</p>
        },
        {
          heading: 'Service providers and public content',
          body: <p>Information may be processed by service providers that support the site, such as hosting, storage, authentication, media delivery, or requested article tools. Material you publish in public areas can be seen by other users.</p>
        },
        {
          heading: 'Retention and security',
          body: <p>Information is kept for as long as needed to provide the service, meet operational needs, and address security or legal requirements. Some automatically collected external news articles are removed after seven days; that schedule does not describe account or reporter content. We use safeguards for stored information, but no internet service can guarantee absolute security.</p>
        },
        {
          heading: 'Your choices and questions',
          body: <p>You can control browser location permission and choose what you submit or publish. For account or privacy questions, contact <a className="font-medium text-primary underline underline-offset-4" href="mailto:support@newsnest.com">support@newsnest.com</a>.</p>
        }
      ]}
    />
  );
}
