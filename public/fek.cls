%% fek.cls — Κλάση XeLaTeX για Φύλλο της Εφημερίδας της Κυβερνήσεως (ΦΕΚ)
%% Συγγραφή: Legisleture Builder
%% Έκδοση: 2.0 (2026) — απαιτεί XeLaTeX
%%
%% Μεταγλώττιση: xelatex nomos.tex
%%
%% Χρήση:
%%   \documentclass[a4paper]{fek}
%%   \fekteuchos{Α΄}
%%   \fekarithmos{1234}
%%   \fekhmeromhnia{18 Ιουνίου 2026}
%%   \fektitlos{ΝΟΜΟΣ ΥΠ' ΑΡΙΘΜ. 5123}
%%   \begin{document}
%%   \maketitle
%%   ...
%%   \end{document}

\NeedsTeXFormat{LaTeX2e}
\ProvidesClass{fek}[2026/06/19 v2.0 Φύλλο Εφημερίδας της Κυβερνήσεως (XeLaTeX)]

% ── Βάση: article, A4, 11pt ──────────────────────────────────────────
\DeclareOption*{\PassOptionsToClass{\CurrentOption}{article}}
\ProcessOptions\relax
\LoadClass[a4paper,11pt]{article}

% ── Πακέτα ────────────────────────────────────────────────────────────
\RequirePackage{fontspec}
\RequirePackage{polyglossia}
\setmainlanguage{greek}
\setotherlanguage{english}
\RequirePackage{geometry}
\RequirePackage{graphicx}
\RequirePackage{fancyhdr}
\RequirePackage{titlesec}
\RequirePackage{enumitem}
\RequirePackage{microtype}
\RequirePackage{xcolor}
\RequirePackage{booktabs}
\RequirePackage{multicol}
\RequirePackage{hyperref}

% ── Χρώματα ΦΕΚ ───────────────────────────────────────────────────────
\definecolor{fekblue}{HTML}{003476}
\definecolor{fekmeta}{HTML}{6b7280}

% ── Σελίδα: περιθώρια ────────────────────────────────────────────────
\geometry{
  a4paper,
  top=25mm,
  bottom=25mm,
  left=25mm,
  right=20mm,
  headheight=14mm,
  headsep=6mm,
  footskip=12mm,
}

% ── Γραμματοσειρά ΦΕΚ (GFS Didot — εγκατάσταση: tlmgr install gfsdidot) ──
\IfFontExistsTF{GFS Didot}{%
  \setmainfont{GFS Didot}%
}{%
  \setmainfont{Palatino Linotype}[Scale=MatchLowercase]%
}

% ── Metadata εντολές ──────────────────────────────────────────────────
\newcommand{\fekteuchos}[1]{\def\@fekteuchos{#1}}
\newcommand{\fekarithmos}[1]{\def\@fekarithmos{#1}}
\newcommand{\fekhmeromhnia}[1]{\def\@fekhmeromhnia{#1}}
\newcommand{\fektitlos}[1]{\def\@fektitlos{#1}}

\fekteuchos{}
\fekarithmos{}
\fekhmeromhnia{}
\fektitlos{}

% ── Κεφαλίδα/υποσέλιδο (fancyhdr) ───────────────────────────────────
\pagestyle{fancy}
\fancyhf{}

% Αριστερή σελίδα: αριθμός σελίδας αριστερά
\fancyhead[LE]{\small\thepage}
% Δεξιά σελίδα: αριθμός σελίδας δεξιά
\fancyhead[RO]{\small\thepage}

\renewcommand{\headrulewidth}{0pt}

% ── \maketitle: ΦΕΚ επικεφαλίδα ──────────────────────────────────────
\renewcommand{\maketitle}{%
  \thispagestyle{plain}%
  \begin{minipage}[c]{0.18\textwidth}
    \IfFileExists{Coat_of_arms_of_Greece.pdf}{%
      \includegraphics[width=\linewidth]{Coat_of_arms_of_Greece}%
    }{%
      \framebox[\linewidth][c]{\small Εθνόσημο}%
    }%
  \end{minipage}%
  \hfill%
  \begin{minipage}[c]{0.55\textwidth}
    \centering
    {\bfseries\large\color{fekblue}%
      ΕΦΗΜΕΡΙ∆Α ΤΗΣ ΚΥΒΕΡΝΗΣΕΩΣ\\[2pt]
      ΤΗΣ ΕΛΛΗΝΙΚΗΣ ∆ΗΜΟΚΡΑΤΙΑΣ%
    }
  \end{minipage}%
  \hfill%
  \begin{minipage}[c]{0.22\textwidth}
    \raggedleft\small\color{fekmeta}
    \ifx\@fekteuchos\empty\else Τεύχος \@fekteuchos\\\fi
    \ifx\@fekarithmos\empty\else Αρ. Φύλλου \@fekarithmos\\\fi
    \@fekhmeromhnia
  \end{minipage}%
  \par\vspace{4pt}%
  {\color{fekblue}\hrule height 0.8pt}%
  \vspace{6pt}%
  \ifx\@fektitlos\empty\else
    {\bfseries\@fektitlos\par\vspace{10pt}}%
  \fi
}

% ── Τίτλοι τμημάτων ───────────────────────────────────────────────────
% Μέρος
\titleformat{\part}[block]
  {\centering\bfseries\large}
  {\partname\ \thepart}{1em}{}

% Κεφάλαιο
\titleformat{\section}[block]
  {\centering\bfseries\normalsize}
  {\thesection.}{0.5em}{}

% Άρθρο (subsection)
\titleformat{\subsection}[block]
  {\bfseries\normalsize}
  {Άρθρο \thesubsection}{0.5em}{}
\titlespacing{\subsection}{0pt}{12pt}{4pt}

% Παράγραφος (subsubsection)
\titleformat{\subsubsection}[runin]
  {\bfseries\normalsize}
  {\thesubsubsection.}{0.5em}{}[.\quad]
\titlespacing{\subsubsection}{0pt}{6pt}{0pt}

% ── Λίστες ────────────────────────────────────────────────────────────
\setlist[enumerate,1]{label=\arabic*., leftmargin=*, topsep=2pt, itemsep=0pt, parsep=0pt}
\setlist[enumerate,2]{label=\alph*., leftmargin=2em, topsep=0pt, itemsep=0pt, parsep=0pt}
\setlist[itemize]{leftmargin=*, topsep=2pt, itemsep=0pt, parsep=0pt}

% ── Τροποποίηση (amendment blockquote) ────────────────────────────────
\newenvironment{fekamendment}{%
  \begin{quote}\itshape\guillemotleft
}{%
  \guillemotright\end{quote}%
}

% ── Δίστηλη διάταξη ───────────────────────────────────────────────────
\newenvironment{fektwocol}{%
  \begin{multicols}{2}%
}{%
  \end{multicols}%
}

% ── Hyperref ──────────────────────────────────────────────────────────
\hypersetup{
  colorlinks=true,
  linkcolor=fekblue,
  urlcolor=fekblue,
  citecolor=fekblue,
  pdfauthor={Legisleture Builder},
  pdflang={el},
}

% ── Γλώσσα (polyglossia ορίζει ελληνικά ως κύρια γλώσσα παραπάνω) ────
% \selectlanguage{greek} — δεν χρειάζεται με polyglossia
