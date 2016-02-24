(function(){
  'use strict'

  var organization_map,
    organizationData,
    filteredData,
    issueCategories,
    markersLayer,
    resetLink = $('#reset-search'),
    searchBar = $('#search-bar'),
    stateDropdown = $('#state-dropdown'),
    issueCategoryDropdown = $('#issue-categories'),
    searchState = {
      searchTextInput: {
        searchTerms: [],
        columns: 'Organization Name,City,State/Region,Contact Name,Contact Email Address,Organization Website,Current Campaigns,Recent Accomplishments,Key Issues,Other Issues'
      },
      stateDropdown: {
        searchTerms: [],
        columns: 'State/Region'
      },
      issueCategoryDropdown: {
        searchTerms: [],
        columns: 'Key Issues'
      }
    };

  //Initialization
  (function(){
    fetchSpreadsheetData();
    populateStateDropdown();
    initMap();
    setResetClickHandler();
    setSearchBoxHandler();
    setCheckboxChangeHandler();
    setStateDropdownChangeHandler();
  })();

  function fetchSpreadsheetData(){
    var URL = "15-iDz53TuM_GwiU9jvekqpYgIlTd_kIMnVZqFKhEHCE";
    Tabletop.init( { key: URL, callback: didReceiveSpreadsheetData, simpleSheet: false, prettyColumnNames: true } );
  }

  function populateStateDropdown(){
    window.stateAbbreviations.forEach(function(elem, i){
      stateDropdown.append($("<option />").val(elem.abbreviation).text(elem.name));
    });
  }

  function populateIssueCategories(){
    issueCategories.forEach(function(elem, i){
      issueCategoryDropdown.append($("<option />").val(elem).text(elem));
    });
  }

  function initMap(){
    var map = L.map('organization_map').setView([38, -96], 4);

    map.scrollWheelZoom.disable();

    organization_map = map;

    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token=pk.eyJ1IjoibWVuZG96YW8iLCJhIjoiY2lrYmZvcXdyMGx3ZXV5bTR3eHprcnJ2OSJ9.sQB96k4p_kJQMCiCgC_XkA', {
      maxZoom: 18,
      id: 'mapbox.streets'
    }).addTo(map);

    markersLayer = new L.FeatureGroup();

    function style(feature) {
      return {
        weight: 1,
        opacity: 1,
        color: 'white',
        dashArray: '',
        fillOpacity: 0.3,
        fillColor: '#B1B1B1'
      };
    }

    function highlightFeature(e) {
      var layer = e.target;

      layer.setStyle({
        weight: 1,
        color: '#666',
        dashArray: '',
        fillOpacity: 0.7
      });

      if (!L.Browser.ie && !L.Browser.opera) {
        layer.bringToFront();
      }
    }

    var geojson;

    function resetHighlight(e) {
      geojson.resetStyle(e.target);
    }

    function zoomToFeature(e) {
      map.fitBounds(e.target.getBounds());
    }

    function onEachFeature(feature, layer) {
      layer.on({
        // mouseover: highlightFeature,
        // mouseout: resetHighlight,
        click: zoomToFeature
      });
    }

    geojson = L.geoJson(statesData, {
      style: style,
      onEachFeature: onEachFeature
    }).addTo(map);
  }

  function didReceiveSpreadsheetData(data) {
    issueCategories = data.Organizations.column_names.slice(17,28);
    organizationData = data.Organizations.elements;
    addBubbles(organizationData);
    populateOrganizationsInList(organizationData);
    filteredData = organizationData;

    populateIssueCategories();
  }

  function updateUI(){
    var searchObjectArray = [searchState.searchTextInput, searchState.stateDropdown, searchState.issueCategoryDropdown];
    var found = filterOrganizations(searchObjectArray, organizationData);

    populateOrganizationsInList(found, function(){
      $('#all-organizations .label-content').highlight(searchState.searchTextInput.searchTerms[0]);
      addBubbles(found);
    });
  }

  function setResetClickHandler(){
    resetLink.on('click', function(){
      resetSearch();
    });
  }

  function resetSearch(){
    searchState.searchTextInput.searchTerms = [];
    searchState.stateDropdown.searchTerms = [];
    searchState.issueCategoryDropdown.searchTerms = [];

    searchBar.val('');
    stateDropdown.val('');
    issueCategoryDropdown.val('');
    updateUI();
    organization_map.setView([27.8, -96], 4)
  }

  function setSearchBoxHandler(){
    var timeoutId;

    //Keyup event vs keypress - keyup captures delete key
    searchBar.on('keyup', function(){
      clearTimeout(timeoutId);
      timeoutId = setTimeout(function(){
        searchState.searchTextInput.searchTerms[0] = searchBar.val();
        updateUI();
      }, 500);
    });
  }

  function setStateDropdownChangeHandler(){
    stateDropdown.on('change', function() {
      searchState.stateDropdown.searchTerms[0] = this.value;
      updateUI();
    });
  }

  function setCheckboxChangeHandler(){
    issueCategoryDropdown.on('change', function() {
      searchState.issueCategoryDropdown.searchTerms[0] = this.value;
      updateUI();
    });
  }

  /**
   * SearchString can be a string or an array of strings
   * Columns is a comma seperated list of columns that we want the search to include

   [
     {
       searchTerms: ['Cassandra'],
       columns: 'Organization Name,City,State,Contact Name,Contact Email Address,Organization Website,Current Campaigns,Recent Accomplishments,Issue Categories'
     },
     {
       searchTerms: ['NY'],
       columns: 'State'
     },
     {
       searchTerms: ['IssueOne', 'IssueTwo', 'IssueThree'],
       columns: 'Issue Categories'
     }
   ]
  */
  function filterOrganizations(searchObjectArray, dataSet){

    return $.grep(dataSet, function(org) {
      //Don't use foreach here - return statement won't cause grep callback to return

      var booleans = []
      for(var i = 0; i < searchObjectArray.length; i++){
        var searchTerms = searchObjectArray[i].searchTerms;
        var columns = searchObjectArray[i].columns.split(',');
        var breakCheck = false;

        if(searchTerms.length === 0){
          booleans.push(true);
        }else {
          for(var j = 0; j < columns.length; j = j + 1) {
            for(var k = 0; k < searchTerms.length; k = k + 1) {
              if(org[columns[j]].toLowerCase().indexOf(searchTerms[k].toLowerCase()) !== -1){
                breakCheck = true;
                break;
              }
            }
            if (breakCheck) { break; }
          }

          if(breakCheck === true) {
            booleans.push(true);
          }else{
            booleans.push(false);
          }
        }
      }

      return booleans.every(function(elem){
        return elem === true;
      });
    });
  }

  function addBubbles(orgs){
    // Remove all bubbles on map first
    markersLayer.clearLayers();

    orgs.forEach(function(organization){
      var marker = L.marker([ organization['Latitude'], organization['Longitude']]);

      marker.on('mouseover', function(){
        marker.bindPopup('<b>' + organization['Organization Name'] + '</b><br>' + organization['City'] + ', ' + organization['State/Region'] + '<br>' + organization['Contact Name'] + '<br>' + organization['Organization Website'] ).openPopup();
      });

      marker.on('mouseout', function(){
        marker.closePopup();
      });

      markersLayer.addLayer(marker);
      organization_map.addLayer(markersLayer);
    });
  }

  function populateOrganizationsInList(orgs, callback){
    $.get('templates/organization-template.html', function(template){
      var allOrgs = "";

      if(orgs.length === 0) {
        allOrgs = '<div class="no-results">0 Results</div>';
      }else {
        orgs.forEach(function(organization){
          organization.keyIssues = organization['Key Issues'].split(',');
          organization.otherIssues = organization['Other Issues'].split(',');
          allOrgs += Mustache.render(template, organization);
        });
      }
      $('#all-organizations').html(allOrgs);
      $('#organization-count').html(orgs.length + ' Results');
      if(typeof callback === 'function'){
        callback();
      }
    });
  }
})();
