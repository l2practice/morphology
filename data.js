/* Morphology — 20 hand-verified test words (English only).
   cls keys: prefix-der, prefix-inf, root-free, root-bound, suffix-der, suffix-inf */
window.IC_DB = {
 "unhappiness": {
  "word": "unhappiness",
  "pos": "Noun",
  "ipa": "/ʌnˈhæpinəs/",
  "gloss": "the state of not being happy",
  "process": "Derivation (prefixation + suffixation)",
  "morphemes": [
   {
    "form": "un-",
    "surface": "un",
    "type": "prefix",
    "cls": "prefix-der",
    "meaning": "Negation: 'not, the opposite of'. Attaches to the adjective happy and reverses its meaning without changing the word class (Adj → Adj).",
    "etym": "Old English un- (Germanic); cognate with Latin in- and Greek a(n)-."
   },
   {
    "form": "happy",
    "surface": "happi",
    "type": "root",
    "cls": "root-free",
    "cat": "Adj",
    "meaning": "Adjective 'feeling or showing pleasure'. A free root: it can stand alone as a complete word.",
    "etym": "Middle English happy, from hap 'luck, chance' (Old Norse happ) + -y."
   },
   {
    "form": "-ness",
    "surface": "ness",
    "type": "suffix",
    "cls": "suffix-der",
    "meaning": "Forms an abstract noun from an adjective: 'the state or quality of being X' (Adj → N).",
    "etym": "Old English -nes(s), a native Germanic suffix."
   }
  ],
  "tree": {
   "label": "unhappiness",
   "cat": "N",
   "children": [
    {
     "label": "unhappy",
     "cat": "Adj",
     "children": [
      {
       "m": 0
      },
      {
       "m": 1
      }
     ]
    },
    {
     "m": 2
    }
   ]
  },
  "insights": {
   "allomorphy": "Orthographic alternation: the final -y of happy is written -i- before a consonant-initial suffix (happy + -ness → happiness). The pronunciation of the root does not change; only the spelling does.",
   "restoration": [
    {
     "surface": "happi-",
     "base": "happy",
     "rule": "i → y (restore final -y)"
    }
   ],
   "derivInfl": "All three morphemes are derivational or root; there is no inflection. un- is class-maintaining (Adj → Adj), -ness is class-changing (Adj → N). Why [[un + happy] + ness] and not [un + [happiness]]? Because un- ('not') attaches to adjectives, so unhappy must be built first; -ness then turns the whole adjective into a noun."
  },
  "family": {
   "root": "hap",
   "rootGloss": "luck, chance",
   "words": [
    "happy",
    "happily",
    "happiness",
    "unhappy",
    "unhappily",
    "hapless",
    "mishap",
    "haphazard",
    "perhaps",
    "happen"
   ]
  }
 },
 "reconstruction": {
  "word": "reconstruction",
  "pos": "Noun",
  "ipa": "/ˌriːkənˈstrʌkʃən/",
  "gloss": "the act or result of building something again",
  "process": "Derivation (two prefixes + suffix on a bound root)",
  "morphemes": [
   {
    "form": "re-",
    "surface": "re",
    "type": "prefix",
    "cls": "prefix-der",
    "meaning": "'Again, back'. Attaches to verbs: re + construct = 'build again'. Class-maintaining (V → V).",
    "etym": "Latin re- 'back, again'."
   },
   {
    "form": "con-",
    "surface": "con",
    "type": "prefix",
    "cls": "prefix-der",
    "meaning": "'Together, with'. Literally 'pile together'. No longer productive with this root in modern English, so construct is often taught as one unit.",
    "etym": "Latin com-/con- 'with, together' (con- is the assimilated form before s, t, d, n)."
   },
   {
    "form": "struct",
    "surface": "struct",
    "type": "root",
    "cls": "root-bound",
    "meaning": "'Build, pile up'. A bound root: it cannot stand alone in English, but recurs in structure, instruct, obstruct, destruction.",
    "etym": "Latin structus, past participle of struere 'to build, pile up'."
   },
   {
    "form": "-ion",
    "surface": "ion",
    "type": "suffix",
    "cls": "suffix-der",
    "meaning": "Forms a noun of action or result from a verb: reconstruct → reconstruction (V → N).",
    "etym": "Latin -io (-ionis) via Old French -ion."
   }
  ],
  "tree": {
   "label": "reconstruction",
   "cat": "N",
   "children": [
    {
     "label": "reconstruct",
     "cat": "V",
     "children": [
      {
       "m": 0
      },
      {
       "label": "construct",
       "cat": "V",
       "children": [
        {
         "m": 1
        },
        {
         "m": 2
        }
       ]
      }
     ]
    },
    {
     "m": 3
    }
   ]
  },
  "insights": {
   "allomorphy": "The suffix {-ion} has several allomorphs: -ion, -tion, -sion, -ation (create → creation, decide → decision, inform → information). After a root ending in -t, plain -ion is selected and /t/ is realised as /ʃ/: construct /kənˈstrʌkt/ → construction /kənˈstrʌkʃən/. The prefix con- is itself an assimilated allomorph of Latin com- (com- before b, p, m: combine, compose).",
   "restoration": [],
   "derivInfl": "All four morphemes are derivational or root; there is no inflection. The first cut is [reconstruct] + [-ion] because re- attaches productively to verbs (rebuild, rewrite, reconstruct). The bracketing [[re-[con-struct]]-ion] shows the history of the word: the verb is built first, then nominalised."
  },
  "family": {
   "root": "struct",
   "rootGloss": "build",
   "words": [
    "structure",
    "construct",
    "construction",
    "constructive",
    "destruction",
    "instruct",
    "instruction",
    "obstruct",
    "infrastructure",
    "restructure"
   ]
  }
 },
 "misunderstanding": {
  "word": "misunderstanding",
  "pos": "Noun",
  "ipa": "/ˌmɪsʌndərˈstændɪŋ/",
  "gloss": "a failure to understand something correctly",
  "process": "Compounding + derivation",
  "morphemes": [
   {
    "form": "mis-",
    "surface": "mis",
    "type": "prefix",
    "cls": "prefix-der",
    "meaning": "'Wrongly, badly'. Attaches to verbs: misunderstand = 'understand wrongly' (V → V).",
    "etym": "Old English mis- (Germanic), reinforced by Old French mes-."
   },
   {
    "form": "under",
    "surface": "under",
    "type": "root",
    "cls": "root-free",
    "cat": "P",
    "meaning": "A free morpheme (preposition) acting as the first element of the compound verb understand. Its meaning is now opaque: understanding is not literally 'standing under'.",
    "etym": "Old English under."
   },
   {
    "form": "stand",
    "surface": "stand",
    "type": "root",
    "cls": "root-free",
    "cat": "V",
    "meaning": "Verb 'to be upright'. The head of the compound understand, which is why understand inflects like stand: understood ~ stood.",
    "etym": "Old English standan."
   },
   {
    "form": "-ing",
    "surface": "ing",
    "type": "suffix",
    "cls": "suffix-der",
    "meaning": "Here it forms a count noun (a misunderstanding, two misunderstandings), so it is derivational (V → N). In 'She is misunderstanding me' the same form would be inflectional.",
    "etym": "Old English -ung / -ing (verbal noun suffix).",
    "variant": "-ing (N)"
   }
  ],
  "tree": {
   "label": "misunderstanding",
   "cat": "N",
   "children": [
    {
     "label": "misunderstand",
     "cat": "V",
     "children": [
      {
       "m": 0
      },
      {
       "label": "understand",
       "cat": "V",
       "children": [
        {
         "m": 1
        },
        {
         "m": 2
        }
       ]
      }
     ]
    },
    {
     "m": 3
    }
   ]
  },
  "insights": {
   "allomorphy": "No spelling change at any boundary: stand + -ing → standing (no consonant doubling because the root ends in two consonants, -nd). The compound understand keeps the irregular past tense of its head: understood, like stood — evidence that stand is the head of the compound.",
   "restoration": [],
   "derivInfl": "Key test: can the word take an article or a plural? A misunderstanding / misunderstandings → it is a noun, so -ing is derivational here. Note that three processes meet in one word: compounding (under + stand), prefixation (mis-) and suffixation (-ing)."
  },
  "family": {
   "root": "stand",
   "rootGloss": "be upright",
   "words": [
    "stand",
    "standing",
    "understand",
    "understood",
    "understandable",
    "misunderstand",
    "misunderstood",
    "withstand",
    "outstanding",
    "notwithstanding"
   ]
  }
 },
 "running": {
  "word": "running",
  "pos": "Verb (present participle)",
  "ipa": "/ˈrʌnɪŋ/",
  "gloss": "moving fast on foot (progressive / participle form of run)",
  "process": "Inflection",
  "morphemes": [
   {
    "form": "run",
    "surface": "runn",
    "type": "root",
    "cls": "root-free",
    "cat": "V",
    "meaning": "Verb 'to move fast on foot'. A free root.",
    "etym": "Old English rinnan / irnan, influenced by Old Norse rinna."
   },
   {
    "form": "-ing",
    "surface": "ing",
    "type": "suffix",
    "cls": "suffix-inf",
    "meaning": "Present participle / progressive marker (be running). It does not create a new word: running is a grammatical form of the verb RUN.",
    "etym": "Old English participle -ende, later merged with the verbal-noun suffix -ing.",
    "variant": "-ing (v)"
   }
  ],
  "tree": {
   "label": "running",
   "cat": "V",
   "children": [
    {
     "m": 0
    },
    {
     "m": 1
    }
   ]
  },
  "insights": {
   "allomorphy": "Consonant doubling (CVC rule): when a stressed syllable ends in a single vowel + single consonant, the consonant is doubled before a vowel-initial suffix: run → runn-ing. Compare rain → raining (two vowel letters, no doubling) and visit → visiting (stress not on the final syllable, no doubling).",
   "restoration": [
    {
     "surface": "runn-",
     "base": "run",
     "rule": "remove the doubled consonant (nn → n)"
    }
   ],
   "derivInfl": "Inflection: -ing marks grammatical aspect, keeps the word class (verb) and the core meaning, and never creates a new dictionary entry. English has only eight inflectional suffixes: -s (3rd sg.), -ed (past), -ing (progressive), -en (past participle), -s (plural), -'s (possessive), -er (comparative), -est (superlative). When running is used as a noun ('Running is healthy'), some grammarians treat -ing as derivational."
  },
  "family": {
   "root": "run",
   "rootGloss": "move fast on foot",
   "words": [
    "run",
    "runs",
    "ran",
    "runner",
    "rerun",
    "runway",
    "outrun",
    "overrun",
    "forerunner",
    "runaway"
   ]
  }
 },
 "arguing": {
  "word": "arguing",
  "pos": "Verb (present participle)",
  "ipa": "/ˈɑːrɡjuːɪŋ/",
  "gloss": "giving reasons; disagreeing in words (progressive form of argue)",
  "process": "Inflection",
  "morphemes": [
   {
    "form": "argue",
    "surface": "argu",
    "type": "root",
    "cls": "root-free",
    "cat": "V",
    "meaning": "Verb 'to give reasons; to disagree'. A free root.",
    "etym": "Latin arguere 'to make clear, prove', via Old French arguer."
   },
   {
    "form": "-ing",
    "surface": "ing",
    "type": "suffix",
    "cls": "suffix-inf",
    "meaning": "Present participle / progressive marker (be arguing). Grammatical, not lexical.",
    "etym": "Old English -ende / -ing.",
    "variant": "-ing (v)"
   }
  ],
  "tree": {
   "label": "arguing",
   "cat": "V",
   "children": [
    {
     "m": 0
    },
    {
     "m": 1
    }
   ]
  },
  "insights": {
   "allomorphy": "Silent-e deletion: a final mute -e is dropped before a vowel-initial suffix: argue + -ing → arguing. The -e belongs to the dictionary form of the root even though it disappears in spelling. Compare arguable (also drops e) and argument (an exception: e is dropped even before a consonant).",
   "restoration": [
    {
     "surface": "argu-",
     "base": "argue",
     "rule": "restore the silent -e"
    }
   ],
   "derivInfl": "-ing here is inflectional (progressive). Contrast argument, where -ment is derivational (V → N): it creates a new word, which can then take its own inflection (arguments)."
  },
  "family": {
   "root": "argu",
   "rootGloss": "make clear, prove",
   "words": [
    "argue",
    "argued",
    "argues",
    "argument",
    "argumentative",
    "argumentation",
    "arguable",
    "arguably"
   ]
  }
 },
 "cities": {
  "word": "cities",
  "pos": "Noun (plural)",
  "ipa": "/ˈsɪtiz/",
  "gloss": "more than one city",
  "process": "Inflection",
  "morphemes": [
   {
    "form": "city",
    "surface": "citi",
    "type": "root",
    "cls": "root-free",
    "cat": "N",
    "meaning": "Noun 'a large town'. A free root.",
    "etym": "Latin civitas 'citizenship, community', via Old French cité."
   },
   {
    "form": "-es",
    "surface": "es",
    "type": "suffix",
    "cls": "suffix-inf",
    "meaning": "Plural marker {-s}: 'more than one'. It changes neither the word class nor the core meaning.",
    "etym": "Old English plural -as (as in stānas 'stones')."
   }
  ],
  "tree": {
   "label": "cities",
   "cat": "N",
   "children": [
    {
     "m": 0
    },
    {
     "m": 1
    }
   ]
  },
  "insights": {
   "allomorphy": "Two levels of variation. (1) Spelling: consonant + y → i before -es: city → citi-es (compare day → days: vowel + y, no change). (2) Pronunciation: the plural morpheme {-s} has three phonologically conditioned allomorphs: /s/ after voiceless sounds (cats), /z/ after voiced sounds (dogs), /ɪz/ after sibilants (buses). In cities it is /z/ because the root ends in a vowel.",
   "restoration": [
    {
     "surface": "citi-",
     "base": "city",
     "rule": "i → y (restore final -y)"
    }
   ],
   "derivInfl": "Plural -es is inflectional: it is required by grammar (two cities, not *two city), it is always attached last (outside any derivational suffix: citizen-s), and it never creates a new dictionary entry."
  },
  "family": {
   "root": "civ",
   "rootGloss": "citizen",
   "words": [
    "city",
    "citizen",
    "citizenship",
    "civic",
    "civil",
    "civilian",
    "civilization",
    "civility"
   ]
  }
 },
 "sunflower": {
  "word": "sunflower",
  "pos": "Noun (compound)",
  "ipa": "/ˈsʌnˌflaʊər/",
  "gloss": "a tall plant with a large yellow flower that turns towards the sun",
  "process": "Compounding (root + root)",
  "morphemes": [
   {
    "form": "sun",
    "surface": "sun",
    "type": "root",
    "cls": "root-free",
    "cat": "N",
    "meaning": "Noun 'the star that gives light and heat to the Earth'. The modifier (non-head) of the compound.",
    "etym": "Old English sunne (Germanic)."
   },
   {
    "form": "flower",
    "surface": "flower",
    "type": "root",
    "cls": "root-free",
    "cat": "N",
    "meaning": "Noun 'the coloured part of a plant'. The head of the compound: a sunflower is a kind of flower.",
    "etym": "Old French flour, from Latin flos, floris 'flower'."
   }
  ],
  "tree": {
   "label": "sunflower",
   "cat": "N",
   "children": [
    {
     "m": 0
    },
    {
     "m": 1
    }
   ]
  },
  "insights": {
   "allomorphy": "No allomorphy and no spelling change. English compounds usually carry primary stress on the first element: SUNflower. This stress pattern helps distinguish a compound from a phrase.",
   "restoration": [],
   "derivInfl": "Neither derivation nor inflection: this is compounding — two free roots combine. By the Right-hand Head Rule, the rightmost element (flower) is the head; it decides the word class and receives inflection: sunflower-s."
  },
  "family": {
   "root": "sun + flor",
   "rootGloss": "sun + flower",
   "words": [
    "sunny",
    "sunshine",
    "sunset",
    "sunrise",
    "Sunday",
    "flowery",
    "floral",
    "florist",
    "flourish",
    "flora"
   ]
  }
 },
 "children": {
  "word": "children",
  "pos": "Noun (plural)",
  "ipa": "/ˈtʃɪldrən/",
  "gloss": "more than one child",
  "process": "Inflection (irregular plural)",
  "morphemes": [
   {
    "form": "child",
    "surface": "child",
    "type": "root",
    "cls": "root-free",
    "cat": "N",
    "meaning": "Noun 'a young human being'. A free root.",
    "etym": "Old English cild."
   },
   {
    "form": "-ren",
    "surface": "ren",
    "type": "suffix",
    "cls": "suffix-inf",
    "meaning": "An irregular, lexically conditioned allomorph of the plural morpheme {-s}. Same grammatical meaning as -s in cats.",
    "etym": "Historically a double plural: Old English cildru (plural -ru > -er) + Middle English weak plural -en (as in oxen) → childer + en → children."
   }
  ],
  "tree": {
   "label": "children",
   "cat": "N",
   "children": [
    {
     "m": 0
    },
    {
     "m": 1
    }
   ]
  },
  "insights": {
   "allomorphy": "{PLURAL} is realised here by the rare allomorph -ren instead of -s, and the root vowel also changes: child /tʃaɪld/ → child- /tʃɪld/. Other irregular plural allomorphs: ox-en (-en), foot → feet (vowel change), sheep → sheep (zero allomorph, Ø).",
   "restoration": [
    {
     "surface": "child- /tʃɪld/",
     "base": "child /tʃaɪld/",
     "rule": "restore the vowel /ɪ/ → /aɪ/"
    }
   ],
   "derivInfl": "Despite its unusual form, -ren is inflectional — it expresses the same grammatical category (plural) as -s. Contrast childhood and childish, where -hood and -ish are derivational and create new words."
  },
  "family": {
   "root": "child",
   "rootGloss": "young human",
   "words": [
    "child",
    "childhood",
    "childish",
    "childlike",
    "childless",
    "childbirth",
    "childcare",
    "grandchild"
   ]
  }
 },
 "uncle": {
  "word": "uncle",
  "pos": "Noun",
  "ipa": "/ˈʌŋkəl/",
  "gloss": "the brother of one's father or mother",
  "process": "Monomorphemic (no word formation)",
  "morphemes": [
   {
    "form": "uncle",
    "surface": "uncle",
    "type": "root",
    "cls": "root-free",
    "cat": "N",
    "meaning": "Noun 'the brother of one's parent'. A single free root: the letters u-n are NOT the prefix un-.",
    "etym": "Anglo-Norman uncle, from Latin avunculus 'mother's brother' (diminutive of avus 'grandfather')."
   }
  ],
  "tree": {
   "label": "uncle",
   "cat": "N",
   "m": 0
  },
  "insights": {
   "allomorphy": "Diagnostic trap (false prefix). Test 1: removing un- leaves *cle, which has no meaning. Test 2: the prefix un- means 'not', but an uncle is not 'not a cle'. Since neither part carries meaning on its own, the word cannot be cut.",
   "restoration": [],
   "derivInfl": "A monomorphemic word has no IC cut: the tree is a single node. It can still be inflected (uncles, uncle's); inflection attaches to the whole root."
  },
  "family": {
   "root": "avunculus",
   "rootGloss": "mother's brother",
   "words": [
    "uncles",
    "avuncular",
    "great-uncle",
    "granduncle"
   ]
  }
 },
 "sing": {
  "word": "sing",
  "pos": "Verb",
  "ipa": "/sɪŋ/",
  "gloss": "to make musical sounds with the voice",
  "process": "Monomorphemic (no word formation)",
  "morphemes": [
   {
    "form": "sing",
    "surface": "sing",
    "type": "root",
    "cls": "root-free",
    "cat": "V",
    "meaning": "Verb 'to make music with the voice'. A single free root: the final -ing is NOT the suffix -ing.",
    "etym": "Old English singan (Germanic)."
   }
  ],
  "tree": {
   "label": "sing",
   "cat": "V",
   "m": 0
  },
  "insights": {
   "allomorphy": "Diagnostic trap (false suffix): removing -ing leaves *s, which is meaningless. sing shows ablaut (internal vowel change) instead of affixation: sing – sang – sung, and the related noun song. These are replacive allomorphs, not added affixes.",
   "restoration": [],
   "derivInfl": "sing is a simple free root (1 morpheme). It can take inflection (sings, singing) or derivation (singer: -er forms an agent noun, V → N)."
  },
  "family": {
   "root": "sing",
   "rootGloss": "make music with the voice",
   "words": [
    "sings",
    "sang",
    "sung",
    "singing",
    "singer",
    "song",
    "songbird",
    "songwriter"
   ]
  }
 },
 "unflobbable": {
  "word": "unflobbable",
  "pos": "Adjective (nonce word)",
  "ipa": "/ʌnˈflɒbəbəl/",
  "gloss": "(hypothetical) not able to be flobbed",
  "process": "Derivation on a nonce root (productivity test)",
  "morphemes": [
   {
    "form": "un-",
    "surface": "un",
    "type": "prefix",
    "cls": "prefix-der",
    "meaning": "Negation 'not'. Attaches to the adjective flobbable (Adj → Adj).",
    "etym": "Old English un- (Germanic)."
   },
   {
    "form": "flob",
    "surface": "flobb",
    "type": "root",
    "cls": "root-free",
    "cat": "V",
    "meaning": "A nonsense root with no dictionary meaning. Because -able attaches to transitive verbs, we infer that flob behaves like a verb: 'to flob something'.",
    "etym": "Nonce (invented) word — no etymology. Used to test whether learners apply morphological rules productively (cf. Berko's 1958 'wug test')."
   },
   {
    "form": "-able",
    "surface": "able",
    "type": "suffix",
    "cls": "suffix-der",
    "meaning": "Forms an adjective from a verb: 'able to be X-ed' (V → Adj).",
    "etym": "Latin -abilis, via Old French -able."
   }
  ],
  "tree": {
   "label": "unflobbable",
   "cat": "Adj",
   "children": [
    {
     "m": 0
    },
    {
     "label": "flobbable",
     "cat": "Adj",
     "children": [
      {
       "m": 1
      },
      {
       "m": 2
      }
     ]
    }
   ]
  },
  "insights": {
   "allomorphy": "Consonant doubling applied to an invented root: flob + -able → flobbable (CVC rule). Learners double the b even though they have never seen the word — clear evidence that spelling rules are productive.",
   "restoration": [
    {
     "surface": "flobb-",
     "base": "flob",
     "rule": "remove the doubled consonant (bb → b)"
    }
   ],
   "derivInfl": "Why [un-[flob-able]] and not [[un-flob]-able]? un- ('not') attaches to adjectives, and there is no verb *unflob. So -able attaches first (flob → flobbable, an adjective), and then un- negates it. This is exactly the structure of un-[predict-able]: the prefix branches LEFT, the stem branches RIGHT. Both affixes are derivational."
  },
  "family": {
   "root": "flob",
   "rootGloss": "nonce root (hypothetical)",
   "words": [
    "flob",
    "flobs",
    "flobbed",
    "flobbing",
    "flobber",
    "flobbable",
    "unflobbed"
   ]
  }
 },
 "visibly": {
  "word": "visibly",
  "pos": "Adverb",
  "ipa": "/ˈvɪzɪbli/",
  "gloss": "in a way that can be seen",
  "process": "Derivation (suffixation) + inflection (adverbial -ly)",
  "morphemes": [
   {
    "form": "vis",
    "surface": "vis",
    "type": "root",
    "cls": "root-bound",
    "cat": "V",
    "meaning": "Bound root meaning 'to see'. It never stands alone; it is shared by vision, visual, visit, visible.",
    "etym": "Latin vis-, from videre 'to see'."
   },
   {
    "form": "-ible",
    "surface": "ib",
    "type": "suffix",
    "cls": "suffix-der",
    "meaning": "Forms an adjective from a root: 'able to be X-ed' (V → Adj). Written ib- here because the final -le is lost before -ly.",
    "etym": "Latin -ibilis 'able to be'."
   },
   {
    "form": "-ly",
    "surface": "ly",
    "type": "suffix",
    "cls": "suffix-inf",
    "meaning": "Adverb-forming suffix: turns the adjective visible into the adverb visibly (Adj → Adv).",
    "etym": "Old English -lice 'in the manner of'.",
    "variant": "-ly (adv)"
   }
  ],
  "tree": {
   "label": "visibly",
   "cat": "Adv",
   "children": [
    {
     "label": "visible",
     "cat": "Adj",
     "children": [
      {
       "m": 0
      },
      {
       "m": 1
      }
     ]
    },
    {
     "m": 2
    }
   ]
  },
  "insights": {
   "allomorphy": "Orthographic alternation: final -le of visible is lost before -ly (visible + -ly → visibly), so the suffix is spelled ib- inside the word.",
   "restoration": [
    {
     "surface": "visib-",
     "base": "visible",
     "rule": "final -le is dropped before -ly"
    }
   ],
   "derivInfl": "-ible is derivational: it builds the adjective visible from the bound root vis-. Adverbial -ly is treated as inflectional in this course."
  },
  "family": {
   "root": "vis-",
   "rootGloss": "to see",
   "words": [
    "vision",
    "visual",
    "visible",
    "invisible",
    "visit",
    "revise",
    "supervise",
    "television"
   ]
  }
 },
 "receptionists": {
  "word": "receptionists",
  "pos": "Noun (plural)",
  "ipa": "/rɪˈsɛpʃənɪsts/",
  "gloss": "people whose job is to welcome visitors and answer calls",
  "process": "Derivation (prefix + two suffixes) + inflection",
  "morphemes": [
   {
    "form": "re-",
    "surface": "re",
    "type": "prefix",
    "cls": "prefix-der",
    "meaning": "'back, again'. Attaches to the bound root -ceive without changing the word class.",
    "etym": "Latin re-, 'back, again'."
   },
   {
    "form": "-ceive",
    "surface": "cep",
    "type": "root",
    "cls": "root-bound",
    "cat": "V",
    "meaning": "Bound root meaning 'to take, get'. It never stands alone; it is shared by receive, deceive, conceive, perceive.",
    "etym": "Latin capere 'to take' via Old French receivre."
   },
   {
    "form": "-tion",
    "surface": "tion",
    "type": "suffix",
    "cls": "suffix-der",
    "meaning": "Forms a noun of action or result from a verb (V → N): receive → reception.",
    "etym": "Latin -tio(n-)."
   },
   {
    "form": "-ist",
    "surface": "ist",
    "type": "suffix",
    "cls": "suffix-der",
    "meaning": "Forms a noun for a person who does or practises something (N → N).",
    "etym": "Greek -istes, via Latin and French."
   },
   {
    "form": "-s",
    "surface": "s",
    "type": "suffix",
    "cls": "suffix-inf",
    "variant": "-s (plural)",
    "meaning": "Plural marker on a noun: receptionist → receptionists.",
    "etym": "Old English plural -as."
   }
  ],
  "tree": {
   "label": "receptionists",
   "cat": "N",
   "children": [
    {
     "label": "receptionist",
     "cat": "N",
     "children": [
      {
       "label": "reception",
       "cat": "N",
       "children": [
        {
         "label": "receive",
         "cat": "V",
         "children": [
          {
           "m": 0
          },
          {
           "m": 1
          }
         ]
        },
        {
         "m": 2
        }
       ]
      },
      {
       "m": 3
      }
     ]
    },
    {
     "m": 4
    }
   ]
  },
  "insights": {
   "allomorphy": "Allomorphy of the bound root: -ceive appears as cep- before -tion (receive → reception). The spelling changes, but it is the same morpheme.",
   "restoration": [
    {
     "surface": "cep-",
     "base": "-ceive",
     "rule": "root allomorph before -tion"
    }
   ],
   "derivInfl": "re-, -tion and -ist are derivational; -s is inflectional and is added last."
  },
  "family": {
   "root": "-ceive / cept-",
   "rootGloss": "to take, get",
   "words": [
    "receive",
    "deceive",
    "conceive",
    "perceive",
    "reception",
    "deception",
    "concept",
    "perception",
    "receipt",
    "receptive"
   ]
  }
 },
 "employment": {
  "word": "employment",
  "pos": "Noun",
  "ipa": "/ɪmˈplɔɪmənt/",
  "gloss": "the state of having a paid job",
  "process": "Derivation (suffix)",
  "morphemes": [
   {
    "form": "employ",
    "surface": "employ",
    "type": "root",
    "cls": "root-free",
    "cat": "V",
    "meaning": "Verb 'to give someone paid work; to use'. Borrowed as a whole from Old French, so in English it is a single morpheme.",
    "etym": "Old French emploier, from Latin implicare 'to enfold, involve'."
   },
   {
    "form": "-ment",
    "surface": "ment",
    "type": "suffix",
    "cls": "suffix-der",
    "meaning": "Forms a noun of action or result from a verb (V → N): employ → employment.",
    "etym": "Latin -mentum, via Old French -ment."
   }
  ],
  "tree": {
   "label": "employment",
   "cat": "N",
   "children": [
    {
     "m": 0
    },
    {
     "m": 1
    }
   ]
  },
  "insights": {
   "allomorphy": "No spelling change: employ + -ment → employment.",
   "restoration": [],
   "derivInfl": "-ment is derivational: it turns the verb employ into a noun. employ itself is a single morpheme (a loanword from French)."
  },
  "etymology": {
   "summary": "From employ (Old French emploier) + the suffix -ment.",
   "steps": [
    {
     "stage": "Latin origin",
     "text": "implicare 'to fold in, involve'."
    },
    {
     "stage": "Old French",
     "text": "emploier, and the noun suffix -ment from Latin -mentum."
    },
    {
     "stage": "English",
     "text": "employ + -ment formed employment 'a use or engagement'."
    }
   ],
   "meanings": []
  },
  "family": {
   "root": "employ",
   "rootGloss": "to give work",
   "words": [
    "employ",
    "employee",
    "employer",
    "employable",
    "unemployed",
    "unemployment"
   ]
  }
 },
 "employ": {
  "word": "employ",
  "pos": "Verb",
  "ipa": "/ɪmˈplɔɪ/",
  "gloss": "to give someone paid work",
  "process": "Single free root (borrowed whole from French)",
  "morphemes": [
   {
    "form": "employ",
    "surface": "employ",
    "type": "root",
    "cls": "root-free",
    "cat": "V",
    "meaning": "Verb 'to give someone paid work; to use'. Borrowed as a whole from Old French, so in English it is a single morpheme.",
    "etym": "Old French emploier, from Latin implicare 'to enfold, involve'."
   }
  ],
  "tree": {
   "label": "employ",
   "cat": "V",
   "m": 0
  },
  "insights": {
   "allomorphy": "No spelling change.",
   "restoration": [],
   "derivInfl": "employ is one morpheme. The Latin parts in- + plicare merged before the word came into English, so they are not analysed as separate morphemes here."
  },
  "etymology": {
   "summary": "Borrowed into English from Old French emploier, which goes back to Latin implicare 'to enfold, involve'.",
   "steps": [
    {
     "stage": "Latin origin",
     "text": "implicare 'to fold in, involve', from in- 'in' + plicare 'to fold'."
    },
    {
     "stage": "Old French",
     "text": "emploier 'to apply, use'; Latin parts had already merged into one word."
    },
    {
     "stage": "Into English",
     "text": "borrowed whole, so English speakers do not feel separate parts in it."
    }
   ],
   "meanings": []
  },
  "family": {
   "root": "employ",
   "rootGloss": "to give work",
   "words": [
    "employment",
    "employee",
    "employer",
    "employable",
    "unemployed",
    "unemployment"
   ]
  }
 },
 "deploy": {
  "word": "deploy",
  "pos": "Verb",
  "ipa": "/dɪˈplɔɪ/",
  "gloss": "to put people or equipment into position for use",
  "process": "Single free root (borrowed whole)",
  "morphemes": [
   {
    "form": "deploy",
    "surface": "deploy",
    "type": "root",
    "cls": "root-free",
    "cat": "V",
    "meaning": "Verb 'to spread out or put into position for action'. Borrowed whole from French, so in English it is a single morpheme.",
    "etym": "French déployer, from Latin displicare 'to unfold'."
   }
  ],
  "tree": {
   "label": "deploy",
   "cat": "V",
   "m": 0
  },
  "insights": {
   "allomorphy": "No spelling change.",
   "restoration": [],
   "derivInfl": "deploy is one morpheme. It was borrowed into English as a whole word, so its Latin or French parts are not analysed as separate morphemes."
  },
  "etymology": {
   "summary": "Borrowed into English from French déployer, which goes back to Latin displicare 'to unfold'.",
   "steps": [
    {
     "stage": "Latin origin",
     "text": "displicare 'to unfold, scatter'."
    },
    {
     "stage": "French",
     "text": "déployer 'to unfold, spread out'."
    },
    {
     "stage": "Into English",
     "text": "borrowed whole in the 1600s as a military term; the parts are not felt in English."
    }
   ],
   "meanings": []
  },
  "family": {
   "root": "deploy",
   "rootGloss": "to unfold, spread out",
   "words": [
    "deployment",
    "deployable",
    "redeploy"
   ]
  }
 },
 "enjoy": {
  "word": "enjoy",
  "pos": "Verb",
  "ipa": "/ɪnˈdʒɔɪ/",
  "gloss": "to get pleasure from something",
  "process": "Single free root (borrowed whole)",
  "morphemes": [
   {
    "form": "enjoy",
    "surface": "enjoy",
    "type": "root",
    "cls": "root-free",
    "cat": "V",
    "meaning": "Verb 'to take pleasure in'. Borrowed whole from Old French, so in English it is a single morpheme.",
    "etym": "Old French enjoier 'to give joy to, rejoice'."
   }
  ],
  "tree": {
   "label": "enjoy",
   "cat": "V",
   "m": 0
  },
  "insights": {
   "allomorphy": "No spelling change.",
   "restoration": [],
   "derivInfl": "enjoy is one morpheme. It was borrowed into English as a whole word, so its Latin or French parts are not analysed as separate morphemes."
  },
  "etymology": {
   "summary": "Borrowed into English from Old French enjoier, formed in French from en- + joie 'joy'.",
   "steps": [
    {
     "stage": "Old French",
     "text": "enjoier 'to rejoice, give joy to', built on joie 'joy'."
    },
    {
     "stage": "Into English",
     "text": "borrowed whole in the Middle Ages, so en- is not felt as a prefix in English."
    }
   ],
   "meanings": []
  },
  "family": {
   "root": "enjoy",
   "rootGloss": "joy",
   "words": [
    "enjoyment",
    "enjoyable",
    "enjoyably",
    "joy"
   ]
  }
 },
 "refer": {
  "word": "refer",
  "pos": "Verb",
  "ipa": "/rɪˈfɜːr/",
  "gloss": "to mention or direct attention to something",
  "process": "Single free root (borrowed whole)",
  "morphemes": [
   {
    "form": "refer",
    "surface": "refer",
    "type": "root",
    "cls": "root-free",
    "cat": "V",
    "meaning": "Verb 'to mention, send to, or consult'. Borrowed whole, so in English it is a single morpheme.",
    "etym": "Latin referre 'to carry back', via Old French referer."
   }
  ],
  "tree": {
   "label": "refer",
   "cat": "V",
   "m": 0
  },
  "insights": {
   "allomorphy": "No spelling change.",
   "restoration": [],
   "derivInfl": "refer is one morpheme. It was borrowed into English as a whole word, so its Latin or French parts are not analysed as separate morphemes."
  },
  "etymology": {
   "summary": "Borrowed into English from Latin referre 'to carry back', through Old French referer.",
   "steps": [
    {
     "stage": "Latin origin",
     "text": "referre 'to carry back', from re- 'back' + ferre 'to carry'."
    },
    {
     "stage": "Old French",
     "text": "referer 'to relate, report'."
    },
    {
     "stage": "Into English",
     "text": "borrowed whole in the 1300s; English speakers do not feel separate parts."
    }
   ],
   "meanings": []
  },
  "family": {
   "root": "refer",
   "rootGloss": "to carry back",
   "words": [
    "reference",
    "referral",
    "referee",
    "referent"
   ]
  }
 },
 "mice": {
  "word": "mice",
  "pos": "Noun (plural)",
  "ipa": "/maɪs/",
  "gloss": "more than one mouse",
  "process": "Inflection (irregular plural)",
  "morphemes": [
   {
    "form": "mouse",
    "surface": "mice",
    "type": "root",
    "cls": "root-free",
    "cat": "N",
    "meaning": "Noun 'a small rodent'. In the plural the root changes its vowel: mouse → mice.",
    "etym": "Old English mūs."
   },
   {
    "form": "-s",
    "surface": "",
    "type": "suffix",
    "cls": "suffix-inf",
    "variant": "-s (plural)",
    "meaning": "Plural marker. It has no separate sound or letter here: the vowel change carries the plural (an irregular, zero allomorph of -s).",
    "etym": "Old English plural -as; mice itself is Old English mȳs, the plural of mūs."
   }
  ],
  "tree": {
   "label": "mice",
   "cat": "N",
   "children": [
    {
     "m": 0
    },
    {
     "m": 1
    }
   ]
  },
  "insights": {
   "allomorphy": "Irregular plural: the vowel of mouse changes (mouse → mice), a remnant of an Old English sound change called i-umlaut. The plural -s has no form of its own, so it is a zero allomorph.",
   "restoration": [
    {
     "surface": "mice-",
     "base": "mouse",
     "rule": "the vowel change marks the plural"
    }
   ],
   "derivInfl": "-s is inflectional: it gives the plural form of the same word and keeps the meaning."
  },
  "etymology": {
   "summary": "From Old English mȳs, the plural of mūs 'mouse', formed by a vowel shift called i-umlaut.",
   "steps": [
    {
     "stage": "Germanic origin",
     "text": "mūs, from Proto-Germanic *mūs."
    },
    {
     "stage": "Old English plural",
     "text": "mȳs; the vowel changed by i-umlaut."
    },
    {
     "stage": "Modern English",
     "text": "mice kept the old vowel change instead of adding -s."
    }
   ],
   "meanings": []
  },
  "family": {
   "root": "mouse",
   "rootGloss": "small rodent",
   "words": [
    "mouse",
    "mousetrap",
    "mousy",
    "dormouse",
    "titmouse"
   ]
  }
 },
 "irrecoverably": {
  "word": "irrecoverably",
  "pos": "Adverb",
  "ipa": "/ˌɪrɪˈkʌvərəbli/",
  "gloss": "in a way that cannot be put right or got back",
  "process": "Derivation (2 prefixes + suffix) + inflection",
  "morphemes": [
   {
    "form": "ir-",
    "surface": "ir",
    "type": "prefix",
    "cls": "prefix-der",
    "allomorphOf": "in-",
    "meaning": "'not'. The form ir- is used before r; it is a variant of in-.",
    "etym": "Latin in- 'not', assimilated before r."
   },
   {
    "form": "re-",
    "surface": "re",
    "type": "prefix",
    "cls": "prefix-der",
    "meaning": "'again, back'. Attaches to a verb without changing the word class.",
    "etym": "Latin re- 'back, again'."
   },
   {
    "form": "cover",
    "surface": "cover",
    "type": "root",
    "cls": "root-free",
    "cat": "V",
    "meaning": "Verb 'to put something over or on top of something'. A free root.",
    "etym": "Old French covrir, from Latin cooperire."
   },
   {
    "form": "-able",
    "surface": "able",
    "type": "suffix",
    "cls": "suffix-der",
    "meaning": "Forms an adjective: 'that can be …-ed' (V → Adj).",
    "etym": "Latin -abilis."
   },
   {
    "form": "-ly",
    "surface": "ly",
    "type": "suffix",
    "cls": "suffix-inf",
    "variant": "-ly (adv)",
    "meaning": "Adverb-forming suffix: Adj → Adv.",
    "etym": "Old English -lice 'in the manner of'."
   }
  ],
  "tree": {
   "label": "irrecoverably",
   "cat": "Adv",
   "children": [
    {
     "label": "irrecoverable",
     "cat": "Adj",
     "children": [
      {
       "m": 0
      },
      {
       "label": "recoverable",
       "cat": "Adj",
       "children": [
        {
         "label": "recover",
         "cat": "V",
         "children": [
          {
           "m": 1
          },
          {
           "m": 2
          }
         ]
        },
        {
         "m": 3
        }
       ]
      }
     ]
    },
    {
     "m": 4
    }
   ]
  },
  "insights": {
   "allomorphy": "The negative prefix in- appears as ir- before r (in- + recoverable → irrecoverable); it is the same prefix.",
   "restoration": [],
   "derivInfl": "ir-, re- and -able are derivational; adverbial -ly is inflectional in this course and is added last."
  },
  "etymology": {
   "summary": "Built in English from ir- + recoverable + -ly; recover itself is re- + cover, from Latin through Old French.",
   "steps": [
    {
     "stage": "Latin origin",
     "text": "cooperire 'to cover completely', which French turned into covrir."
    },
    {
     "stage": "Old French",
     "text": "covrir 'to cover'; English re- + cover gives recover 'to get back'."
    },
    {
     "stage": "Into English",
     "text": "recover + -able, then the negative prefix ir-, then adverbial -ly."
    }
   ],
   "meanings": []
  },
  "family": {
   "root": "cover",
   "rootGloss": "to put over",
   "words": [
    "cover",
    "recover",
    "recoverable",
    "discover",
    "uncover",
    "coverage"
   ]
  }
 }
};
