import { Header, Footer } from '../components';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface StaticPageProps {
    type: 'about' | 'contact' | 'privacy' | 'disclaimer';
}

const STATIC_CONTENT = {
    about: {
        title: 'About SarkariExams.me',
        content: `
            <h2>Who We Are</h2>
            <p>SarkariExams.me is an independent information aggregation platform dedicated to organizing and presenting government job notifications, examination results, and educational opportunities from publicly available sources.</p>
            
            <h3>Our Mission</h3>
            <p>To provide a centralized, organized platform where job seekers can easily access government job notifications, results, admit cards, and related information without navigating multiple official websites.</p>
            
            <h3>What We Do</h3>
            <ul>
                <li><strong>Information Aggregation:</strong> We collect job notifications from official government websites and reliable sources</li>
                <li><strong>Organization & Categorization:</strong> We organize content by type, location, qualification, and deadline for easy browsing</li>
                <li><strong>Quick Access:</strong> We provide direct links to original sources for applications and official information</li>
                <li><strong>Notification Services:</strong> We offer email subscriptions to keep users updated about new opportunities</li>
            </ul>
            
            <h3>Important Information</h3>
            <p><strong>We are not a recruitment agency or government organization.</strong> All job applications must be submitted through official government websites. We strongly recommend verifying all information from original official sources before applying.</p>
            
            <h3>Data Sources</h3>
            <p>Our information is sourced from:</p>
            <ul>
                <li>Official government department websites</li>
                <li>State and central recruitment board notifications</li>
                <li>Public service commission announcements</li>
                <li>Educational board and university notifications</li>
            </ul>
            
            <p>Last updated: January 2025</p>
        `
    },
    contact: {
        title: 'Contact Information',
        content: `
            <h2>Get in Touch</h2>
            <p>We welcome feedback, suggestions, and inquiries about our information aggregation services.</p>
            
            <div class="contact-methods">
                <h3>General Inquiries</h3>
                <p>For general questions about our services, content accuracy, or feature suggestions:</p>
                <p><strong>Response Time:</strong> We aim to respond within 48 hours</p>
                
                <h3>Content Issues</h3>
                <p>If you notice incorrect information or broken links:</p>
                <ul>
                    <li>Include the specific page URL</li>
                    <li>Describe the issue clearly</li>
                    <li>Provide the correct information if available</li>
                </ul>
                
                <h3>Technical Support</h3>
                <p>For website functionality issues, subscription problems, or technical difficulties:</p>
                <ul>
                    <li>Describe the problem step by step</li>
                    <li>Include your browser and device information</li>
                    <li>Mention if the issue is consistent or intermittent</li>
                </ul>
                
                <h3>Important Notice</h3>
                <p><strong>We cannot:</strong></p>
                <ul>
                    <li>Process job applications (these must be submitted through official channels)</li>
                    <li>Provide official recruitment information beyond what's publicly available</li>
                    <li>Act as intermediaries for government recruitment processes</li>
                    <li>Guarantee the accuracy of third-party information</li>
                </ul>
            </div>
            
            <div class="disclaimer-box">
                <h4>⚠️ Application Disclaimer</h4>
                <p>For official job applications, eligibility queries, or status updates, please contact the respective recruiting organization directly through their official websites or helplines.</p>
            </div>
        `
    },
    privacy: {
        title: 'Privacy Policy',
        content: `
            <h2>Privacy Policy</h2>
            <p><strong>Effective Date:</strong> January 2025</p>
            
            <h3>Information We Collect</h3>
            
            <h4>Information You Provide:</h4>
            <ul>
                <li><strong>Email Subscriptions:</strong> Email address and preferred notification categories</li>
                <li><strong>Bookmarks:</strong> Saved job/result preferences (stored locally)</li>
                <li><strong>User Accounts:</strong> Optional registration information for enhanced features</li>
            </ul>
            
            <h4>Automatically Collected Information:</h4>
            <ul>
                <li><strong>Usage Analytics:</strong> Page views, popular content, and user interaction patterns</li>
                <li><strong>Technical Data:</strong> Browser type, device information, IP address (anonymized)</li>
                <li><strong>Performance Data:</strong> Website performance and error reporting</li>
            </ul>
            
            <h3>How We Use Your Information</h3>
            <ul>
                <li><strong>Email Notifications:</strong> Send relevant job/result updates based on your preferences</li>
                <li><strong>Service Improvement:</strong> Analyze usage patterns to improve website functionality</li>
                <li><strong>Technical Support:</strong> Troubleshoot issues and maintain website performance</li>
                <li><strong>Legal Compliance:</strong> Comply with applicable data protection regulations</li>
            </ul>
            
            <h3>Information Sharing</h3>
            <p>We do <strong>not</strong> sell, rent, or share your personal information with third parties for marketing purposes.</p>
            
            <p>We may share information in these limited circumstances:</p>
            <ul>
                <li><strong>Service Providers:</strong> Email delivery services and website analytics (with data processing agreements)</li>
                <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
                <li><strong>Business Transfers:</strong> In connection with a merger or acquisition (users will be notified)</li>
            </ul>
            
            <h3>Data Security</h3>
            <ul>
                <li>Encrypted data transmission (HTTPS)</li>
                <li>Secure server infrastructure</li>
                <li>Regular security audits and updates</li>
                <li>Access controls and authentication</li>
            </ul>
            
            <h3>Your Rights</h3>
            <ul>
                <li><strong>Access:</strong> Request information about data we have about you</li>
                <li><strong>Correction:</strong> Update or correct your information</li>
                <li><strong>Deletion:</strong> Request removal of your personal data</li>
                <li><strong>Unsubscribe:</strong> Opt out of email notifications at any time</li>
            </ul>
            
            <h3>Cookies and Tracking</h3>
            <p>We use essential cookies for website functionality and optional analytics cookies to improve our services. You can control cookie preferences through your browser settings.</p>
            
            <h3>Children's Privacy</h3>
            <p>Our services are not directed to children under 13. We do not knowingly collect personal information from children.</p>
            
            <h3>Contact for Privacy Matters</h3>
            <p>For privacy-related questions, data requests, or concerns about this policy, please contact us using the information in our Contact page.</p>
            
            <p><em>This policy may be updated periodically. Users will be notified of significant changes.</em></p>
        `
    },
    disclaimer: {
        title: 'Disclaimer',
        content: `
            <h2>Important Disclaimers</h2>
            
            <div class="disclaimer-section">
                <h3>🏛️ Government Affiliation</h3>
                <p><strong>SarkariExams.me is NOT affiliated with any government organization, recruitment board, or official agency.</strong> We are an independent information aggregation service that collects and organizes publicly available job notifications.</p>
            </div>
            
            <div class="disclaimer-section">
                <h3>📋 Information Accuracy</h3>
                <p>While we strive to provide accurate and up-to-date information:</p>
                <ul>
                    <li><strong>All information is sourced from publicly available notices and websites</strong></li>
                    <li><strong>We cannot guarantee 100% accuracy or completeness</strong></li>
                    <li><strong>Official notifications may be updated or corrected by issuing authorities</strong></li>
                    <li><strong>Always verify information from original official sources before applying</strong></li>
                </ul>
            </div>
            
            <div class="disclaimer-section">
                <h3>🎯 User Responsibility</h3>
                <p>It is your responsibility to:</p>
                <ul>
                    <li>Verify all information from official government sources</li>
                    <li>Check eligibility criteria directly with recruiting organizations</li>
                    <li>Submit applications through official channels only</li>
                    <li>Meet all deadlines and requirements as specified by authorities</li>
                    <li>Keep track of your application status through official systems</li>
                </ul>
            </div>
            
            <div class="disclaimer-section">
                <h3>🔗 External Links</h3>
                <p>Our website contains links to external websites:</p>
                <ul>
                    <li>We are not responsible for the content or privacy practices of external sites</li>
                    <li>Linking does not imply endorsement of external content</li>
                    <li>External sites may have different terms and policies</li>
                </ul>
            </div>
            
            <div class="disclaimer-section">
                <h3>💼 Application Process</h3>
                <p><strong>Important:</strong></p>
                <ul>
                    <li><strong>We do NOT process job applications</strong></li>
                    <li><strong>We do NOT provide recruitment services</strong></li>
                    <li><strong>We do NOT charge fees for information access</strong></li>
                    <li><strong>All applications must be submitted through official government websites</strong></li>
                </ul>
            </div>
            
            <div class="disclaimer-section">
                <h3>⚖️ Legal Limitations</h3>
                <p>SarkariExams.me and its operators:</p>
                <ul>
                    <li>Provide information "as is" without warranties</li>
                    <li>Are not liable for decisions made based on our content</li>
                    <li>Cannot be held responsible for missed opportunities or application errors</li>
                    <li>Do not guarantee job placement or selection outcomes</li>
                </ul>
            </div>
            
            <div class="disclaimer-section">
                <h3>📅 Data Timeliness</h3>
                <p>Information may not always be immediately updated:</p>
                <ul>
                    <li>Deadlines may pass before we can update content</li>
                    <li>New notifications may take time to appear on our site</li>
                    <li>Always check original sources for the most current information</li>
                </ul>
            </div>
            
            <div class="disclaimer-section warning-box">
                <h3>⚠️ Critical Reminder</h3>
                <p><strong>ALWAYS VERIFY INFORMATION FROM OFFICIAL SOURCES BEFORE TAKING ANY ACTION.</strong> This website is a convenience tool for information discovery, not a substitute for official government communications.</p>
            </div>
            
            <p><em>By using this website, you acknowledge that you have read and understood these disclaimers.</em></p>
            
            <p><strong>Last Updated:</strong> January 2025</p>
        `
    }
};

export function StaticPage({ type }: StaticPageProps) {
    const { user, token, logout, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const content = STATIC_CONTENT[type];

    return (
        <div className="app">
            <Header
                setCurrentPage={(page) => page === 'admin' ? navigate('/admin') : navigate('/' + page)}
                user={user}
                token={token}
                isAuthenticated={isAuthenticated}
                onLogin={() => navigate('/')}
                onLogout={logout}
                onProfileClick={() => navigate('/profile')}
            />
            
            <main className="main-content">
                <div className="static-page">
                    <button 
                        className="back-btn" 
                        onClick={() => navigate('/')}
                        aria-label="Go back to home page"
                    >
                        ← Back to Home
                    </button>
                    
                    <article className="static-content">
                        <header className="static-header">
                            <h1>{content.title}</h1>
                        </header>
                        
                        <div 
                            className="static-body" 
                            dangerouslySetInnerHTML={{ __html: content.content }}
                        />
                    </article>
                </div>
            </main>
            
            <Footer setCurrentPage={(page) => navigate('/' + page)} />
        </div>
    );
}