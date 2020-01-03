if(!removeDupes) var removeDupes={};

removeDupes.QuickSort =
{
  sdata                : Array (),
  taskStackL           : Array (),
  taskStackR           : Array (),
  stillSorting         : true,
  left                : 0,
  right               : 0,
  numMaxSwaps : 0,
  step                 : 0,
  comp                 : function (a,b) {},
  doneFunction         : function () {},


  SetDoneFunction : function ( f )
  {
    this.doneFunction = f;
  },

  SetArray : function ( a )
  {
    this.sdata = a;
  },

  SetCompare : function ( f )
  {
    this.comp = f;
  },

  Start : function ()
  {
    this.stillSorting = true;
    this.numMaxSwaps = Math.ceil ( 4 * this.sdata.length * Math.log (this.sdata.length) / Math.LN10);
    while (this.taskStackL.pop());
    while (this.taskStackR.pop());
    this.taskStackL.push (0);
    this.taskStackR.push (this.sdata.length-1);
    setTimeout ( function() {this.sparts(0,0,0, this);}, 10 );
  },



  sparts : function ( p_i, p_j, p_pivot, obj )
  {
    while (obj.stillSorting)
    {
      var cont = false;
      var temp;

      if ( p_i!=0 || p_j!=0 || p_pivot!=0 )
        cont = true;

      if (!cont)
      {
        obj.left  = obj.taskStackL.pop();
        obj.right = obj.taskStackR.pop();
      }

      if (obj.right > obj.left || cont )
      {
        var i,j,pivot;

        if ( !cont )
        {
          i = obj.left;
          j = obj.right-1;
          pivot = obj.right;
        }
        else
        {
          i = p_i;
          j = p_j;
          pivot = p_pivot;
          cont = false;
          p_i=0;p_j=0;p_pivot=0;
        }

        while (true)
        {
          while ( obj.comp (obj.sdata[i], obj.sdata[pivot]) )
          {
            i++;
            obj.step++;
            if (obj.step%500==0)
            {
              removeDupes.Rdm.dfStatusText.label = removeDupes.Rdm.dfBundle.getString("removedupes.phase") + " 2: " + obj.step + " / ~" + obj.numMaxSwaps;
              removeDupes.Rdm.dfProgbar.value = 100 * obj.step / obj.numMaxSwaps;
              setTimeout ( function() {removeDupes.QuickSort.sparts(i,j,pivot, obj);}, 10 );
              return;
            }
          }
          while ( obj.comp (obj.sdata[pivot], obj.sdata[j])  && (j > obj.left) )
          {
            j -= 1;
            obj.step++;
            if (obj.step%500==0)
            {
              removeDupes.Rdm.dfStatusText.label = removeDupes.Rdm.dfBundle.getString("removedupes.phase") + " 2: " + obj.step + " / ~" + obj.numMaxSwaps;
              removeDupes.Rdm.dfProgbar.value = 100 * obj.step / obj.numMaxSwaps;
              setTimeout ( function() {removeDupes.QuickSort.sparts(i,j,pivot, obj);}, 10 );
              return;
            }
          }
          if (i >= j) break;
          temp = obj.sdata[i];
          obj.sdata[i] = obj.sdata[j];
          obj.sdata[j] = temp;
        } // while true

        temp = obj.sdata[i];
        obj.sdata[i] = obj.sdata[pivot];
        obj.sdata[pivot] = temp;

        obj.taskStackL.push (obj.left);
        obj.taskStackR.push (i-1);
        obj.taskStackL.push (i+1);
        obj.taskStackR.push (obj.right);
      }
      if ( obj.taskStackL.length == 0 || obj.taskStackR.length == 0 )
      {
        removeDupes.Rdm.dfStatusText.label = removeDupes.Rdm.dfBundle.getString("removedupes.phase") + " 2: " + obj.step + " / ~" + obj.numMaxSwaps;
        removeDupes.Rdm.dfProgbar.value = 100;
        obj.stillSorting = false;
        obj.doneFunction(0);
      }
    } // while (stillSorting)
  }

}
