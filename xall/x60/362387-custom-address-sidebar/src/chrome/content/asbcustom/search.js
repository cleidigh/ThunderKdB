(function() {
	var project = com.namespace("com.github.shimamu.asbcustom.search");

	function init() {
		com.github.shimamu.asbcustom.customPrefs.prefs.setUnicharPref(
			"ldap_2.servers.default.attrmap.Department",
			"ou,department,departmentnumber,orgunit");
		startSearch();
	}

	var SubQuery = {
		create(condition, value) {
			var query = Object.create(SubQuery.prototype);
			query.condition = condition;
			query.value = value;
			return query;
		},
		prototype: {
			/*
			 * query format: "(or(DisplayName,@C,@V)(FirstName,@C,@V)(LastName,@C,@V))"
			 */
			build() {
				var query = this;
				var range = SearchRange.create();
				var out = {
					result: "",
					put(key) {
						this.result += "(" + key + "," + query.condition + "," + query.value + ")";
					}
				}
				range.build(out);
				return "(or" + out.result + ")";
			}
		}
	}

	var SearchQuery = {
		create(terms, mode) {
			var query = Object.create(SearchQuery.prototype);
			query.terms = terms;
			query.mode = mode;
			return query;
		},
		prototype: {
			build(uri) {
				/* Token   Condition
				 *  =       Is
				 *  !=      Is Not
				 *  lt      Less Than
				 *  gt      Greater Than
				 *  bw      Begins With
				 *  ew      Ends With
				 *  c       Contains
				 *  !c      Does Not Contain
				 *
				 * see nsAbQueryStringToExpression::CreateBooleanConditionString in
				 * ./mailnews/addrbook/src/nsAbQueryStringToExpression.cpp
				 */
				if (uri.isLdapDirectory() && this.terms.isNone()) {
					this.terms.setWildcard();
				}
				var query = this;
				var out = {
					result : "",
					count : 0,
					put(condition, string) {
						var subQuery = SubQuery.create(condition, encodeURIComponent(string));
						this.result += subQuery.build();
					}
				};
				this.terms.build(this.mode, out);

				if (out.count > 1) {
					out.result = "?(and" + out.result + ")";
				} else if (out.count == 1) {
					out.result = "?" + out.result;
				}
				return out.result;
			}

		}
	}

	var SearchMode = {
		create() {
			var mode = Object.create(SearchMode.prototype);
			mode.value = "c";
			return mode;
		},
		prototype: {
			setBeginsWith() {
				this.value = "bw";
			},
			setEndsWith() {
				this.value = "ew";
			},
			setIs() {
				this.value = "=";
			},
		}
	}

	var SearchURI = {
		create() {
			var uri = Object.create(SearchURI.prototype);
			uri.directory = GetSelectedDirectory();

			var terms = SearchTerms.create();
			var mode = SearchMode.create();
			uri.query = SearchQuery.create(terms, mode);

			return uri;
		},
		prototype: {
			isBlank() {
				return (!this.directory);
			},
			isLdapDirectory() {
				var ldapUrlPrefix = "moz-abldapdirectory://";
				var result = ((this.directory.indexOf(ldapUrlPrefix, 0)) == 0)
				return result;
			},
			isValid() {
				return (!this.isBlank());
			},
			search() {
				SetAbView(this.directory + this.query.build(this));
			}
		}
	};

	var SearchTerm = {
		create(value) {
			var term = Object.create(SearchTerm.prototype);
			term.value = value;
			return term;
		},
		prototype: {
			isBlank() {
				return (this.value == "");
			},
			isWildcard() {
				return (this.value == "*");
			}
		}
	}

	var SearchTerms = {
		create() {
			var terms = Object.create(SearchTerms.prototype);
			var element = document.getElementById("peopleSearchInput");
			var list = [];
			if (element.value != "") {
				list = element.value.split(" ");
			}
			terms.list = [];
			list.forEach(function(string) {
				terms.list.push(SearchTerm.create(string));
			});
			return terms;
		},
		prototype: {
			isNone() {
				return (this.list.length <= 0);
			},
			isValidSearchQuery() {
				return !this.isNone(); 
			},
			setWildcard() {
				this.list = [SearchTerm.create("*")];
			},
			build(mode, out) {
				this.list.forEach(function(term) {
					if (!term.isBlank()) {
						out.count++;
						// When using wildcard search (*), always use the condition "="
						if (term.isWildcard()) {
							mode.setIs();
						}
						var condition = mode.value;
						out.put(condition, term.value);
					}
				});
			}
		}
	}

	var AddressSearcher = {
		create() {
			var searcher = Object.create(AddressSearcher.prototype);
			return searcher;
		},
		prototype: {
			search() {
				var uri = SearchURI.create();
				if (!uri.isValid()) {
					return;
				}
				uri.search();
			}
		}
	};

	function startSearch() {
		var searcher = AddressSearcher.create();
		searcher.search();
	}

	function onSearchTermChange() {
		startSearch();
	}

	function onAddressBookListChange() {
		startSearch();
	}

	var SearchOption = {
		create(prefName, value, keywords) {
			var option = Object.create(SearchOption.prototype);
			option.prefName = prefName;
			option.value = value;
			option.keywords = keywords;
			return option;
		},
		default: true,
		prototype: {
			load() {
				this.value = com.github.shimamu.asbcustom.customPrefs.prefs.getBoolPref(
					this.prefName, SearchOption.default);
			},
			isSearchOn() {
				return this.value;
			}
		}
	}

	var SearchRange = {
		create() {
			var range = Object.create(SearchRange.prototype);
			range.list = this._createOptionList();
			range.load();
			return range;
		},
		_createOptionList() {
			var list = new Array(
				SearchOption.create("asbcustom.search_generated_name"  , false, ["FirstName", "LastName", "DisplayName"]),
				SearchOption.create("asbcustom.search_primary_email"   , false, ["PrimaryEmail"  ]),
				SearchOption.create("asbcustom.search_aim_screen_name" , false, ["_AimScreenName"]),
				SearchOption.create("asbcustom.search_company"         , false, ["Company"       ]),
				SearchOption.create("asbcustom.search_nick_name"       , false, ["NickName"      ]),
				SearchOption.create("asbcustom.search_second_email"    , false, ["SecondEmail"   ]),
				SearchOption.create("asbcustom.search_department"      , false, ["Department"    ]),
				SearchOption.create("asbcustom.search_job_title"       , false, ["JobTitle"      ]),
				SearchOption.create("asbcustom.search_cellular_number" , false, ["CellularNumber"]),
				SearchOption.create("asbcustom.search_pager_number"    , false, ["PagerNumber"   ]),
				SearchOption.create("asbcustom.search_fax_number"      , false, ["FaxNumber"     ]),
				SearchOption.create("asbcustom.search_home_phone"      , false, ["HomePhone"     ]),
				SearchOption.create("asbcustom.search_work_phone"      , false, ["WorkPhone"     ])
			);
			return list;
		},
		prototype: {
			load() {
				this.list.forEach(function(option) {
					option.load();
				});
			},
			build(out) {
				this.list.forEach(function(option) {
					if (option.isSearchOn()) {
						option.keywords.forEach(function(key) {
							out.put(key);
						});
					}
				});
			}
		}
	}

	project.onAddressBookListChange = onAddressBookListChange;
	project.onSearchTermChange = onSearchTermChange;
	project.SearchURI = SearchURI;
	project.init = init;
}());
