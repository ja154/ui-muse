import pandas as pd
import json
import sys
from rank_bm25 import BM25Okapi
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

class DesignSystemGenerator:
    _SECTION_LIBRARY = {
        "hero": "hero-section",
        "features": "features-section",
        "cta": "cta-section",
        "footer": "footer-section",
        "pricing": "pricing-section",
        "projects": "projects-section",
        "contact": "contact-section",
        "articles": "articles-section",
        "newsletter": "newsletter-section",
        "work": "work-section",
        "services": "services-section",
        "stats": "stats-section",
        "security": "security-section"
    }

    def __init__(self, csv_path):
        try:
            self.df = pd.read_csv(csv_path)
            self.tokenized_corpus = [str(doc).split(" ") for doc in self.df['description'].tolist()]
            self.bm25 = BM25Okapi(self.tokenized_corpus)
            self.vectorizer = TfidfVectorizer()
            self.tfidf_matrix = self.vectorizer.fit_transform(self.df['description'].tolist())
        except Exception as e:
            print(f"Error initializing: {e}", file=sys.stderr)
            self.df = pd.DataFrame()

    def _get_color(self, row, base_name, default):
        # Resolver that tries all known alias variants
        aliases = [base_name, f"{base_name} (Hex)", base_name.capitalize(), f"{base_name.capitalize()} (Hex)"]
        if base_name.lower() == "accent":
            aliases.extend(["CTA", "CTA (Hex)"])
            
        for alias in aliases:
            if alias in row and pd.notna(row[alias]) and str(row[alias]).strip():
                val = str(row[alias]).strip()
                if val.startswith("#"):
                    return val
                # Basic color name to hex map if not hex
                color_map = {
                    "blue": "#007bff", "gray": "#6c757d", "green": "#28a745", "red": "#dc3545",
                    "yellow": "#ffc107", "cyan": "#17a2b8", "white": "#ffffff", "black": "#000000",
                    "navy": "#000080", "orange": "#ff6321", "cream": "#f5f5dc", "olive": "#808000"
                }
                return color_map.get(val.lower(), val)
        return default

    def _resolve_section_slugs(self, section_str):
        # Parses any section-order string (e.g. "Hero > Features > CTA")
        # and always appends footer if it's missing.
        if not section_str or not isinstance(section_str, str):
            return ["hero-section", "features-section", "footer-section"]
            
        delimiters = [">", ",", "|", ";"]
        parts = [section_str]
        for d in delimiters:
            new_parts = []
            for p in parts:
                new_parts.extend([x.strip() for x in p.split(d)])
            parts = new_parts
            
        slugs = []
        for p in parts:
            p_lower = p.lower()
            if p_lower in self._SECTION_LIBRARY:
                slugs.append(self._SECTION_LIBRARY[p_lower])
            else:
                slugs.append("generic-section")
                
        if "footer-section" not in slugs:
            slugs.append("footer-section")
            
        return slugs

    def generate(self, query):
        if self.df.empty:
            return {"error": "No design specs found"}
            
        tokenized_query = query.split(" ")
        bm25_scores = self.bm25.get_scores(tokenized_query)
        
        # Fallback: when all scores are zero, return the top-N rows by CSV order
        if sum(bm25_scores) == 0:
            best_match_idx = 0
        else:
            query_vec = self.vectorizer.transform([query])
            cosine_sim = cosine_similarity(query_vec, self.tfidf_matrix).flatten()
            combined_scores = bm25_scores + (cosine_sim * 10) # Weight TF-IDF more
            best_match_idx = combined_scores.argmax()
            
        best_match = self.df.iloc[best_match_idx]
        
        return {
            "primary_color": self._get_color(best_match, "primary", "#007bff"),
            "secondary_color": self._get_color(best_match, "secondary", "#6c757d"),
            "accent_color": self._get_color(best_match, "accent", "#ffc107"),
            "foreground_color": self._get_color(best_match, "foreground", "#ffffff"),
            "font_family": best_match.get('font_family', 'Inter'),
            "layout_type": best_match.get('layout_type', 'Standard'),
            "sections": self._resolve_section_slugs(best_match.get('sections', ''))
        }

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No query provided"}))
        sys.exit(1)
        
    query = sys.argv[1]
    generator = DesignSystemGenerator("data/design_specs.csv")
    result = generator.generate(query)
    print(json.dumps(result))
