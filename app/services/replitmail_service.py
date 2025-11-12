# Replit Mail Email Service Integration
# Based on blueprint:replitmail integration

import os
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
import requests

logger = logging.getLogger(__name__)

class ReplitMailService:
    """Enhanced email service using Replit Mail integration for templates and reliable delivery"""
    
    def __init__(self):
        self.api_url = "https://connectors.replit.com/api/v2/mailer/send"
        self.is_configured = bool(os.environ.get("REPL_IDENTITY") or os.environ.get("WEB_REPL_RENEWAL"))
        
        if self.is_configured:
            logger.info("Replit Mail service initialized")
        else:
            logger.warning("Replit Mail service not configured - missing Replit environment tokens")
    
    def _get_auth_token(self) -> str:
        """Get authentication token for Replit Mail service"""
        repl_identity = os.environ.get("REPL_IDENTITY")
        web_repl_renewal = os.environ.get("WEB_REPL_RENEWAL")
        
        if repl_identity:
            return f"repl {repl_identity}"
        elif web_repl_renewal:
            return f"depl {web_repl_renewal}"
        else:
            raise ValueError("No authentication token found for Replit Mail")
    
    def send_email_with_template(
        self,
        to_email: str,
        template_name: str,
        variables: Dict[str, Any],
        case_title: Optional[str] = None,
        user_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Send email using predefined HTML templates"""
        
        if not self.is_configured:
            return {
                "success": False,
                "error": "Replit Mail service not configured",
                "message_id": None
            }
        
        try:
            # Get template content
            template = self._get_email_template(template_name, variables, case_title, user_name)
            
            auth_token = self._get_auth_token()
            
            payload = {
                "to": to_email,
                "subject": template["subject"],
                "html": template["html"],
                "text": template["text"]
            }
            
            headers = {
                "Content-Type": "application/json",
                "X_REPLIT_TOKEN": auth_token
            }
            
            response = requests.post(self.api_url, json=payload, headers=headers, timeout=(3.05, 10))
            
            if response.ok:
                result = response.json()
                logger.info(f"Email sent successfully via Replit Mail to {to_email}")
                return {
                    "success": True,
                    "message_id": result.get("messageId"),
                    "accepted": result.get("accepted", []),
                    "error": None
                }
            else:
                error_data = response.json() if response.headers.get("content-type", "").startswith("application/json") else {}
                error_message = error_data.get("message", f"HTTP {response.status_code}")
                logger.error(f"Replit Mail API error: {error_message}")
                return {
                    "success": False,
                    "error": f"Email sending failed: {error_message}",
                    "message_id": None
                }
                
        except requests.exceptions.Timeout as e:
            logger.error(f"Replit Mail timeout: {e}")
            return {"success": False, "error": "Email service timeout", "message_id": None}
        except requests.exceptions.RequestException as e:
            logger.error(f"Replit Mail network error: {e}")
            return {"success": False, "error": f"Network error: {e}", "message_id": None}
        except Exception as e:
            logger.error(f"Unexpected error in Replit Mail service: {e}")
            return {
                "success": False,
                "error": f"Unexpected error: {str(e)}",
                "message_id": None
            }
    
    def _get_email_template(self, template_name: str, variables: Dict[str, Any], case_title: Optional[str], user_name: Optional[str]) -> Dict[str, str]:
        """Get HTML and text templates for different email types"""
        
        # Base template variables
        base_vars = {
            "user_name": user_name or "Szanowny Kliencie",
            "case_title": case_title or "Twoja sprawa",
            "company_name": "AI Prawnik PL",
            "support_email": "pomoc@prawnik.ai",
            "support_phone": "+48 123 456 789",
            "panel_url": "https://prawnik.ai/panel-klienta",
            "current_year": datetime.now().year,
            **variables
        }
        
        templates = {
            "payment_confirmation": {
                "subject": "Płatność potwierdzona - AI Prawnik PL",
                "html": self._create_payment_confirmation_html(base_vars),
                "text": f"""
Dziękujemy za płatność!

Szanowny/a {base_vars['user_name']},

Płatność w wysokości {base_vars.get('amount', 'N/A')} zł za analizę sprawy "{base_vars['case_title']}" została potwierdzona.

Nasz prawnik przystąpi teraz do szczegółowej analizy Twoich dokumentów. Otrzymasz powiadomienie gdy analiza będzie gotowa.

Status sprawy możesz sprawdzić w panelu klienta: {base_vars['panel_url']}

Dziękujemy za zaufanie!
Zespół AI Prawnik PL
                """.strip()
            },
            
            "analysis_ready": {
                "subject": "Analiza dokumentów gotowa - AI Prawnik PL",
                "html": self._create_analysis_ready_html(base_vars),
                "text": f"""
Analiza dokumentów gotowa!

Szanowny/a {base_vars['user_name']},

Analiza dokumentów w sprawie "{base_vars['case_title']}" została ukończona.

W panelu klienta znajdziesz:
• Szczegółową analizę prawną
• Rekomendacje działań
• Możliwe opcje postępowania

Zaloguj się do panelu: {base_vars['panel_url']}

Zespół AI Prawnik PL
                """.strip()
            },
            
            "invoice_notification": {
                "subject": f"Faktura nr {base_vars.get('invoice_number', 'XXX')} - AI Prawnik PL",
                "html": self._create_invoice_notification_html(base_vars),
                "text": f"""
Nowa faktura

Szanowny/a {base_vars['user_name']},

Została wystawiona faktura nr {base_vars.get('invoice_number', 'XXX')} na kwotę {base_vars.get('amount', 'N/A')} zł.

Usługa: {base_vars['case_title']}
Link do płatności: {base_vars.get('payment_url', base_vars['panel_url'])}

Dziękujemy!
Zespół AI Prawnik PL
                """.strip()
            },
            
            "welcome_client": {
                "subject": "Witamy w AI Prawnik PL!",
                "html": self._create_welcome_html(base_vars),
                "text": f"""
Witamy w AI Prawnik PL!

Szanowny/a {base_vars['user_name']},

Dziękujemy za rejestrację w AI Prawnik PL!

Twoje konto zostało aktywowane. Możesz już korzystać z naszych usług prawnych:

• Analiza dokumentów przez AI
• Konsultacje z prawnikami
• Przygotowanie pism prawnych
• Kompleksowa obsługa spraw

Panel klienta: {base_vars['panel_url']}

Zespół AI Prawnik PL
                """.strip()
            }
        }
        
        return templates.get(template_name, {
            "subject": "Powiadomienie - AI Prawnik PL",
            "html": f"<p>Wiadomość dla {base_vars['user_name']}</p>",
            "text": f"Wiadomość dla {base_vars['user_name']}"
        })
    
    def _create_payment_confirmation_html(self, vars: Dict[str, Any]) -> str:
        """Create HTML template for payment confirmation"""
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Płatność potwierdzona</title>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }}
        .success-badge {{ background: #22c55e; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; display: inline-block; margin-bottom: 20px; }}
        .case-info {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #1e40af; }}
        .button {{ background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }}
        .footer {{ text-align: center; color: #666; font-size: 14px; margin-top: 30px; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>AI Prawnik PL</h1>
        <p>Płatność potwierdzona</p>
    </div>
    
    <div class="content">
        <div class="success-badge">✓ Płatność potwierdzona</div>
        
        <h2>Szanowny/a {vars['user_name']},</h2>
        
        <p>Dziękujemy za płatność! Twoja transakcja została pomyślnie przetworzona.</p>
        
        <div class="case-info">
            <h3>Szczegóły sprawy:</h3>
            <p><strong>Sprawa:</strong> {vars['case_title']}</p>
            <p><strong>Kwota:</strong> {vars.get('amount', 'N/A')} zł</p>
            <p><strong>Status:</strong> Płatność potwierdzona</p>
        </div>
        
        <p>Nasz prawnik przystąpi teraz do szczegółowej analizy Twoich dokumentów. Otrzymasz powiadomienie gdy analiza będzie gotowa.</p>
        
        <a href="{vars['panel_url']}" class="button">Sprawdź status w panelu klienta</a>
        
        <p>Jeśli masz pytania, skontaktuj się z nami:</p>
        <ul>
            <li>Email: {vars['support_email']}</li>
            <li>Telefon: {vars['support_phone']}</li>
        </ul>
    </div>
    
    <div class="footer">
        <p>&copy; {vars['current_year']} AI Prawnik PL. Wszystkie prawa zastrzeżone.</p>
    </div>
</body>
</html>
        """.strip()
    
    def _create_analysis_ready_html(self, vars: Dict[str, Any]) -> str:
        """Create HTML template for analysis ready notification"""
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Analiza dokumentów gotowa</title>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f0fdf4; padding: 30px; border-radius: 0 0 8px 8px; }}
        .ready-badge {{ background: #059669; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; display: inline-block; margin-bottom: 20px; }}
        .analysis-info {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #059669; }}
        .button {{ background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }}
        .features {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }}
        .footer {{ text-align: center; color: #666; font-size: 14px; margin-top: 30px; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>AI Prawnik PL</h1>
        <p>Analiza dokumentów gotowa</p>
    </div>
    
    <div class="content">
        <div class="ready-badge">📋 Analiza ukończona</div>
        
        <h2>Szanowny/a {vars['user_name']},</h2>
        
        <p>Analiza dokumentów w sprawie <strong>"{vars['case_title']}"</strong> została ukończona!</p>
        
        <div class="features">
            <h3>W panelu klienta znajdziesz:</h3>
            <ul>
                <li>📊 Szczegółową analizę prawną</li>
                <li>💡 Rekomendacje działań</li>
                <li>📋 Możliwe opcje postępowania</li>
                <li>📄 Przygotowane dokumenty prawne</li>
            </ul>
        </div>
        
        <a href="{vars['panel_url']}" class="button">Sprawdź analizę w panelu</a>
        
        <div class="analysis-info">
            <p><strong>Uwaga:</strong> Analiza została przygotowana przez nasz system AI we współpracy z prawnikiem. Zalecamy skonsultowanie szczegółów z naszym zespołem prawnym.</p>
        </div>
    </div>
    
    <div class="footer">
        <p>&copy; {vars['current_year']} AI Prawnik PL. Wszystkie prawa zastrzeżone.</p>
    </div>
</body>
</html>
        """.strip()
    
    def _create_invoice_notification_html(self, vars: Dict[str, Any]) -> str:
        """Create HTML template for invoice notification"""
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Nowa faktura</title>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #7c3aed; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background: #faf5ff; padding: 30px; border-radius: 0 0 8px 8px; }}
        .invoice-badge {{ background: #7c3aed; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; display: inline-block; margin-bottom: 20px; }}
        .invoice-details {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #7c3aed; }}
        .button {{ background: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }}
        .footer {{ text-align: center; color: #666; font-size: 14px; margin-top: 30px; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>AI Prawnik PL</h1>
        <p>Nowa faktura</p>
    </div>
    
    <div class="content">
        <div class="invoice-badge">🧾 Faktura {vars.get('invoice_number', 'XXX')}</div>
        
        <h2>Szanowny/a {vars['user_name']},</h2>
        
        <p>Została wystawiona nowa faktura za nasze usługi prawne.</p>
        
        <div class="invoice-details">
            <h3>Szczegóły faktury:</h3>
            <p><strong>Nr faktury:</strong> {vars.get('invoice_number', 'XXX')}</p>
            <p><strong>Kwota:</strong> {vars.get('amount', 'N/A')} zł</p>
            <p><strong>Usługa:</strong> {vars['case_title']}</p>
            <p><strong>Data wystawienia:</strong> {vars.get('invoice_date', datetime.now().strftime('%d.%m.%Y'))}</p>
        </div>
        
        <a href="{vars.get('payment_url', vars['panel_url'])}" class="button">Opłać fakturę</a>
        
        <p>Faktura zostanie automatycznie opłacona jeśli masz aktywną subskrypcję lub wystarczające środki na koncie.</p>
    </div>
    
    <div class="footer">
        <p>&copy; {vars['current_year']} AI Prawnik PL. Wszystkie prawa zastrzeżone.</p>
    </div>
</body>
</html>
        """.strip()
    
    def _create_welcome_html(self, vars: Dict[str, Any]) -> str:
        """Create HTML template for welcome email"""
        return f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Witamy w AI Prawnik PL</title>
    <style>
        body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }}
        .header {{ background: #1e40af; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }}
        .content {{ background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }}
        .welcome-badge {{ background: #1e40af; color: white; padding: 8px 16px; border-radius: 20px; font-weight: bold; display: inline-block; margin-bottom: 20px; }}
        .services {{ background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }}
        .service-item {{ margin: 10px 0; padding: 10px; border-left: 3px solid #1e40af; }}
        .button {{ background: #1e40af; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; margin: 20px 0; }}
        .footer {{ text-align: center; color: #666; font-size: 14px; margin-top: 30px; }}
    </style>
</head>
<body>
    <div class="header">
        <h1>🎉 Witamy w AI Prawnik PL!</h1>
        <p>Twoje konto zostało aktywowane</p>
    </div>
    
    <div class="content">
        <div class="welcome-badge">👋 Witamy!</div>
        
        <h2>Szanowny/a {vars['user_name']},</h2>
        
        <p>Dziękujemy za rejestrację w AI Prawnik PL! Twoje konto zostało pomyślnie aktywowane.</p>
        
        <div class="services">
            <h3>Dostępne usługi:</h3>
            <div class="service-item">🤖 <strong>Analiza dokumentów przez AI</strong> - Szybka i dokładna analiza prawna</div>
            <div class="service-item">👥 <strong>Konsultacje z prawnikami</strong> - Profesjonalne doradztwo prawne</div>
            <div class="service-item">📄 <strong>Przygotowanie pism prawnych</strong> - Dokumenty dopasowane do Twojej sprawy</div>
            <div class="service-item">🏢 <strong>Kompleksowa obsługa spraw</strong> - Pełne wsparcie prawne</div>
        </div>
        
        <a href="{vars['panel_url']}" class="button">Przejdź do panelu klienta</a>
        
        <p>Masz pytania? Skontaktuj się z nami:</p>
        <ul>
            <li>📧 Email: {vars['support_email']}</li>
            <li>📱 Telefon: {vars['support_phone']}</li>
        </ul>
    </div>
    
    <div class="footer">
        <p>&copy; {vars['current_year']} AI Prawnik PL. Wszystkie prawa zastrzeżone.</p>
    </div>
</body>
</html>
        """.strip()

# Global Replit Mail service instance
replitmail_service = ReplitMailService()